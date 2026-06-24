package com.doan.reviewhub.repository;

import com.doan.reviewhub.entity.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HotelRepository extends JpaRepository<Hotel, String> {

    Optional<Hotel> findByHotelCode(String hotelCode);

    boolean existsByHotelCode(String hotelCode);

    List<Hotel> findByHotelNameContainingIgnoreCase(String keyword);

    List<Hotel> findByRegionContainingIgnoreCase(String region);
}