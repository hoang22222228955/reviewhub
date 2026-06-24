package com.doan.reviewhub.agent;

import lombok.Builder;
import lombok.Getter;

/**
 * Kết quả trả về từ mỗi agent trong pipeline.
 */
@Getter
@Builder
public class AgentResult {

    /** true = bước này thành công/cho phép tiếp tục */
    private final boolean passed;

    /** Điểm tin cậy 0.0 – 1.0 (Validator gán, các agent khác giữ nguyên) */
    private final double confidence;

    /** Lý do ngắn gọn */
    private final String reason;

    /** Trạng thái moderation: "approved" | "pending_review" | "rejected" */
    private final String moderationStatus;
}
