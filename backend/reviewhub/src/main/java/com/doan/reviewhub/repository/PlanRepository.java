package com.doan.reviewhub.repository;

import com.doan.reviewhub.entity.Plan;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanRepository extends JpaRepository<Plan, String> {
}
