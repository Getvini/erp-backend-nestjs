import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface ScannedEndpoint {
  methodName: string;
  httpMethod: string;
  fullPath: string;
  roles: string[];
  isPublic: boolean;
}

export interface ControllerInventory {
  name: string;
  prefix: string;
  endpointCount: number;
  endpoints: ScannedEndpoint[];
}

export class RouteScanner {
  private static cachedInventory: ControllerInventory[] | null = null;

  static loadInventory(): ControllerInventory[] {
    if (this.cachedInventory) {
      return this.cachedInventory;
    }

    const inventoryPath = resolve(__dirname, '../endpoint-inventory.json');
    if (!existsSync(inventoryPath)) {
      throw new Error(`Endpoint inventory file not found at: ${inventoryPath}. Run "npx ts-node -r tsconfig-paths/register scripts/generate-endpoint-inventory.ts" first.`);
    }

    const content = JSON.parse(readFileSync(inventoryPath, 'utf-8'));
    this.cachedInventory = content.controllers || [];
    return this.cachedInventory!;
  }

  static getController(controllerName: string): ControllerInventory | undefined {
    const list = this.loadInventory();
    return list.find((c) => c.name === controllerName);
  }

  static getEndpointsFor(controllerName: string): ScannedEndpoint[] {
    const ctrl = this.getController(controllerName);
    return ctrl ? ctrl.endpoints : [];
  }
}
