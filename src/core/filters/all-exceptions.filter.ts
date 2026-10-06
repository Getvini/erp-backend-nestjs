import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = "Lỗi hệ thống nội bộ";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === "object" && "message" in res
          ? (res as any).message
          : res;
    } else if ((exception as any)?.code === "23505") {
      status = HttpStatus.CONFLICT;
      message = "Dữ liệu đã tồn tại trong hệ thống (Duplicate constraint)";
    } else if ((exception as any)?.code === "23503") {
      status = HttpStatus.BAD_REQUEST;
      message = "Không thể thực hiện do ràng buộc khóa ngoại không hợp lệ";
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const formattedMessage = Array.isArray(message)
      ? message.join("; ")
      : message;

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${status} - Error: ${JSON.stringify(formattedMessage)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Tương thích 100% với FE (FE đọc toast.error(err?.data?.message))
    response.status(status).json({
      success: false,
      statusCode: status,
      message: formattedMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
