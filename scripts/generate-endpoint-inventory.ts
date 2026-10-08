import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env.test') });

import { writeFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

export interface EndpointInventoryItem {
  controllerName: string;
  controllerPath: string;
  filePath: string;
  methodName: string;
  httpMethod: string;
  endpointPath: string;
  fullPath: string;
  roles?: string[];
  isPublic?: boolean;
}

export interface EndpointInventorySummary {
  generatedAt: string;
  totalControllers: number;
  totalEndpoints: number;
  controllers: {
    name: string;
    prefix: string;
    endpointCount: number;
    endpoints: {
      methodName: string;
      httpMethod: string;
      fullPath: string;
      roles: string[];
      isPublic: boolean;
    }[];
  }[];
}

async function generateInventory() {
  // Tạo Nest application context ở chế độ logger error để không làm rác output
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  await app.init();

  const server = app.getHttpServer();
  const router = server._events.request._router;

  // Lấy danh sách routes từ NestJS metadata scan
  const routes: EndpointInventoryItem[] = [];
  const modulesContainer = (app as any).container.getModules();

  const controllerMap = new Map<string, {
    name: string;
    prefix: string;
    endpointCount: number;
    endpoints: any[];
  }>();

  for (const [_, moduleRef] of modulesContainer.entries()) {
    const controllers = moduleRef.controllers;
    for (const [_, controllerWrapper] of controllers.entries()) {
      const instance = controllerWrapper.instance;
      const metatype = controllerWrapper.metatype;
      if (!instance || !metatype) continue;

      const controllerName = metatype.name;
      const prefix = Reflect.getMetadata('path', metatype) || '';

      const prototype = Object.getPrototypeOf(instance);
      const methodNames = Object.getOwnPropertyNames(prototype).filter(
        (m) => m !== 'constructor' && typeof prototype[m] === 'function'
      );

      const endpointsForController: any[] = [];

      for (const methodName of methodNames) {
        const method = prototype[methodName];
        const path = Reflect.getMetadata('path', method);
        const requestMethodCode = Reflect.getMetadata('method', method);

        if (path === undefined || requestMethodCode === undefined) {
          continue;
        }

        const methodMap: Record<number, string> = {
          0: 'GET',
          1: 'POST',
          2: 'PUT',
          3: 'DELETE',
          4: 'PATCH',
          5: 'ALL',
          6: 'OPTIONS',
          7: 'HEAD',
        };
        const httpMethod = methodMap[requestMethodCode] || 'UNKNOWN';

        const cleanPrefix = prefix ? (prefix.startsWith('/') ? prefix : `/${prefix}`) : '';
        const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
        const fullPath = `${cleanPrefix}${cleanPath}`.replace(/\/+/g, '/') || '/';

        const roles = Reflect.getMetadata('roles', method) || Reflect.getMetadata('roles', metatype) || [];
        const isPublic = Boolean(Reflect.getMetadata('isPublic', method) || Reflect.getMetadata('isPublic', metatype));

        endpointsForController.push({
          methodName,
          httpMethod,
          fullPath,
          roles,
          isPublic,
        });
      }

      if (endpointsForController.length > 0) {
        controllerMap.set(controllerName, {
          name: controllerName,
          prefix: cleanPrefix(prefix),
          endpointCount: endpointsForController.length,
          endpoints: endpointsForController,
        });
      }
    }
  }

  function cleanPrefix(p: string) {
    if (!p) return '/';
    return p.startsWith('/') ? p : `/${p}`;
  }

  const controllersArray = Array.from(controllerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const totalEndpoints = controllersArray.reduce((acc, c) => acc + c.endpointCount, 0);

  const inventorySummary: EndpointInventorySummary = {
    generatedAt: new Date().toISOString(),
    totalControllers: controllersArray.length,
    totalEndpoints,
    controllers: controllersArray,
  };

  const outputPath = resolve(__dirname, '../test/endpoint-inventory.json');
  writeFileSync(outputPath, JSON.stringify(inventorySummary, null, 2), 'utf-8');

  console.log(`\n==================================================`);
  console.log(`✅ ENDPOINT INVENTORY GENERATED SUCCESSFULLY!`);
  console.log(`==================================================`);
  console.log(`- Total Controllers scanned: ${controllersArray.length}`);
  console.log(`- Total Endpoints scanned:   ${totalEndpoints}`);
  console.log(`- File written:              test/endpoint-inventory.json\n`);

  await app.close();
  process.exit(0);
}

generateInventory().catch((err) => {
  console.error('Failed to generate endpoint inventory:', err);
  process.exit(1);
});
