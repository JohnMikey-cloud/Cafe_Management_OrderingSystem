package com.cafe.repo;

import com.cafe.model.CafeOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CafeOrderRepository extends JpaRepository<CafeOrder, Long> {
    List<CafeOrder> findAllByOrderByCreatedAtDesc();
}