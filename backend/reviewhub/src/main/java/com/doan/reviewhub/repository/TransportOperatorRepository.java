package com.doan.reviewhub.repository;

import com.doan.reviewhub.entity.TransportOperator;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TransportOperatorRepository extends JpaRepository<TransportOperator, Long> {

    Optional<TransportOperator> findByOperatorCode(String operatorCode);
}
