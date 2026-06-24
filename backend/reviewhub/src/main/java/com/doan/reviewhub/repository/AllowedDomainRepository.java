package com.doan.reviewhub.repository;

import com.doan.reviewhub.entity.AllowedDomain;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AllowedDomainRepository extends JpaRepository<AllowedDomain, Long> {

    List<AllowedDomain> findByPartnerCodeOrderByCreatedAtDesc(String partnerCode);

    boolean existsByPartnerCodeAndDomain(String partnerCode, String domain);

    void deleteByIdAndPartnerCode(Long id, String partnerCode);
}
