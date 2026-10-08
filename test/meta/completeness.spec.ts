import { readdirSync, statSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { RouteScanner, ControllerInventory } from '../helpers/route-scanner';

function getAllSpecFiles(dir: string): string[] {
  let results: string[] = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== 'meta') {
        results = results.concat(getAllSpecFiles(fullPath));
      }
    } else if (file.endsWith('.spec.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Meta Test: Controller & Endpoint Coverage Completeness Guard', () => {
  let inventory: ControllerInventory[];
  let specFiles: string[];
  let specContents: Map<string, string>;

  beforeAll(() => {
    inventory = RouteScanner.loadInventory();
    const testDir = resolve(__dirname, '..');
    specFiles = getAllSpecFiles(testDir);

    specContents = new Map();
    for (const file of specFiles) {
      specContents.set(file, readFileSync(file, 'utf-8'));
    }
  });

  it('phải có đủ 48 Controllers và 288 Endpoints trong inventory scan', () => {
    expect(inventory).toBeDefined();
    expect(inventory.length).toBe(48);

    const totalEndpoints = inventory.reduce((sum, c) => sum + c.endpointCount, 0);
    expect(totalEndpoints).toBe(288);
  });

  it('mọi Controller trong Inventory phải có kế hoạch test hoặc đã triển khai file spec', () => {
    const controllerNames = inventory.map((c) => c.name);
    expect(controllerNames.length).toBe(48);

    // Kiểm tra danh sách các file spec hiện tại
    const coveredControllers: string[] = [];
    for (const ctrl of inventory) {
      const isCovered = Array.from(specContents.values()).some((content) =>
        content.includes(ctrl.name)
      );
      if (isCovered) {
        coveredControllers.push(ctrl.name);
      }
    }

    // Ghi log tiến độ phủ controller hiện tại
    console.log(`[Completeness Guard] Hiện tại đã có ${coveredControllers.length}/48 Controllers có spec file.`);
    expect(coveredControllers.length).toBe(48);
  });
});
