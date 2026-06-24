package com.doan.reviewhub.repository;

import com.doan.reviewhub.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, String> {

    Page<Review> findByOperatorCode(String operatorCode, Pageable pageable);

    Page<Review> findByOwnerPartnerCode(String ownerPartnerCode, Pageable pageable);

    @Query("""
        SELECT r FROM Review r
        WHERE r.moderationStatus = 'approved'
          AND (r.visibility = 'public' OR r.ownerPartnerCode = :partnerCode)
        ORDER BY r.createdAt DESC
    """)
    Page<Review> findAllowedForPartner(
            @Param("partnerCode") String partnerCode,
            Pageable pageable
    );

    @Query("""
        SELECT r FROM Review r
        WHERE r.moderationStatus = 'approved'
          AND (r.visibility = 'public' OR r.ownerPartnerCode = :partnerCode)
          AND (:keyword IS NULL OR :keyword = ''
               OR LOWER(r.targetName) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(r.comment) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:category = 'all' OR r.category = :category)
          AND (:visibility = 'all' OR r.visibility = :visibility)
    """)
    Page<Review> searchAllowedForPartner(
            @Param("partnerCode") String partnerCode,
            @Param("keyword") String keyword,
            @Param("category") String category,
            @Param("visibility") String visibility,
            Pageable pageable
    );

    /**
     * Review được phép hiển thị cho partner.
     * - Google Maps / Public-web: dữ liệu dùng chung, được xem theo mã dịch vụ đã gán/mua.
     * - Partner-web: dữ liệu riêng của tài khoản partner, chỉ người tạo mới thấy sau khi admin duyệt.
     * - Nguồn khác: giữ tương thích, vẫn xem theo mã dịch vụ hoặc owner key.
     */
    @Query("""
        SELECT r FROM Review r
        WHERE r.moderationStatus = 'approved'
          AND (
                (
                    r.sourceSystem IN ('google-maps', 'public-web')
                    AND (
                        r.operatorCode IN :operatorCodes
                        OR r.targetCode IN :operatorCodes
                        OR r.ownerPartnerCode IN :operatorCodes
                    )
                )
                OR
                (
                    r.sourceSystem = 'partner-web'
                    AND r.ownerPartnerCode IN :ownerKeys
                )
                OR
                (
                    r.sourceSystem NOT IN ('google-maps', 'public-web', 'partner-web')
                    AND (
                        r.operatorCode IN :operatorCodes
                        OR r.targetCode IN :operatorCodes
                        OR r.ownerPartnerCode IN :operatorCodes
                        OR r.ownerPartnerCode IN :ownerKeys
                    )
                )
          )
          AND (:keyword IS NULL OR :keyword = ''
               OR LOWER(r.targetName) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(r.comment) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(r.reviewerName) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:category = 'all' OR r.category = :category)
          AND (:visibility = 'all' OR r.visibility = :visibility)
          AND (:sourceSystem = 'all' OR r.sourceSystem = :sourceSystem)
    """)
    Page<Review> searchForPartnerScope(
            @Param("operatorCodes") List<String> operatorCodes,
            @Param("ownerKeys") List<String> ownerKeys,
            @Param("keyword") String keyword,
            @Param("category") String category,
            @Param("visibility") String visibility,
            @Param("sourceSystem") String sourceSystem,
            Pageable pageable
    );

    @Query("""
        SELECT r FROM Review r
        WHERE r.operatorCode = :operatorCode
          AND r.moderationStatus = 'approved'
          AND (:keyword IS NULL OR :keyword = ''
               OR LOWER(r.targetName) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(r.comment) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(r.reviewerName) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:category = 'all' OR r.category = :category)
          AND (:visibility = 'all' OR r.visibility = :visibility)
          AND (:sourceSystem = 'all' OR r.sourceSystem = :sourceSystem)
    """)
    Page<Review> searchByOperator(
            @Param("operatorCode") String operatorCode,
            @Param("keyword") String keyword,
            @Param("category") String category,
            @Param("visibility") String visibility,
            @Param("sourceSystem") String sourceSystem,
            Pageable pageable
    );

    List<Review> findTop5ByOperatorCodeOrderByCreatedAtDesc(String operatorCode);

    List<Review> findByModerationStatus(String moderationStatus);

    List<Review> findByModerationStatusIgnoreCase(String moderationStatus);

    // ─── SLA stats ──────────────────────────────────────────────────────────

    long countByOwnerPartnerCode(String partnerCode);

    long countByOwnerPartnerCodeAndModerationStatus(String partnerCode, String status);

    @Query("SELECT COALESCE(AVG(r.aiConfidence), 0) FROM Review r WHERE r.ownerPartnerCode = :partnerCode AND r.aiConfidence IS NOT NULL")
    double avgAiConfidenceByPartnerCode(@Param("partnerCode") String partnerCode);
}
