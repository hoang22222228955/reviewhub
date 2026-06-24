package com.doan.reviewhub.repository;

import com.doan.reviewhub.entity.UserPlanSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserPlanSubscriptionRepository extends JpaRepository<UserPlanSubscription, Long> {
    List<UserPlanSubscription> findByUserId(String userId);
    Optional<UserPlanSubscription> findByUserIdAndIsCurrentTrue(String userId);
}
