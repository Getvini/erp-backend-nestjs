import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface Response<T> {
  success: boolean;
  statusCode: number;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((res) => {
        // Nếu kết quả trả về từ service đã có { data, meta } (chuẩn CQRS)
        if (res && typeof res === "object" && "data" in res && "meta" in res) {
          return {
            success: true,
            statusCode,
            data: res.data,
            meta: res.meta,
          };
        }

        // Nếu kết quả trả về từ service đã có định dạng { items, total, ... }
        if (
          res &&
          typeof res === "object" &&
          "items" in res &&
          "total" in res
        ) {
          return {
            success: true,
            statusCode,
            data: res,
            items: res.items,
            total: res.total,
            meta: {
              total: res.total,
              page: res.page,
              limit: res.limit,
              totalPages: res.limit
                ? Math.ceil(res.total / res.limit)
                : undefined,
            },
          };
        }

        // Nếu service trả về { data, total, page, limit } (kiểu cũ)
        if (res && typeof res === "object" && "data" in res && "total" in res) {
          return {
            success: true,
            statusCode,
            data: res.data,
            meta: {
              total: res.total,
              page: res.page,
              limit: res.limit,
              totalPages: res.limit
                ? Math.ceil(res.total / res.limit)
                : undefined,
            },
          };
        }

        return {
          success: true,
          statusCode,
          data: res,
        };
      }),
    );
  }
}
