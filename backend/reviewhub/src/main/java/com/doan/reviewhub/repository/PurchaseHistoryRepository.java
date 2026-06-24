package com.doan.reviewhub.repository;

import com.doan.reviewhub.entity.PurchaseHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PurchaseHistoryRepository extends JpaRepository<PurchaseHistory, String> {
    List<PurchaseHistory> findByUserIdOrderByPurchasedAtDesc(String userId);
}
