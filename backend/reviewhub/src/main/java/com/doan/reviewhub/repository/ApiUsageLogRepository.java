package com.doan.reviewhub.repository;

import com.doan.reviewhub.entity.ApiUsageLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApiUsageLogRepository extends JpaRepository<ApiUsageLog, Long> {

    List<ApiUsageLog> findByPartnerIdOrderByCalledAtDesc(String partnerId, Pageable pageable);
}
