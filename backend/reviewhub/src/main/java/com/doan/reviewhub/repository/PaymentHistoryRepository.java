package com.doan.reviewhub.repository;

import com.doan.reviewhub.entity.PaymentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentHistoryRepository extends JpaRepository<PaymentHistory, String> {
    List<PaymentHistory> findByUserIdOrderByPaidAtDesc(String userId);
}
