export enum ProjectStatus {
  PENDING_CONFIRMATION = "PENDING_CONFIRMATION", // Chờ xác nhận
  CONFIRMED = "CONFIRMED", // Team Lead đã nhận
  IN_PROGRESS = "IN_PROGRESS", // Đang thực hiện (sau khi upload hợp đồng đã ký)
  PENDING_PAUSE_APPROVAL = "PENDING_PAUSE_APPROVAL", // Chờ duyệt yêu cầu tạm dừng
  ON_HOLD = "ON_HOLD", // Tạm dừng — task bị khoá
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum GoogleSheetStatus {
  NOT_CREATED = "NOT_CREATED",
  CREATING = "CREATING",
  CREATED = "CREATED",
  FAILED = "FAILED",
}
