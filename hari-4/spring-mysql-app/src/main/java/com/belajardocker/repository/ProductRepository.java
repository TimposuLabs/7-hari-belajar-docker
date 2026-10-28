package com.belajardocker.repository;

import com.belajardocker.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Cari berdasarkan nama (tidak membedakan huruf besar/kecil)
    List<Product> findByNamaContainingIgnoreCase(String nama);

    // Produk dengan stok di bawah atau sama dengan batas
    @Query("SELECT p FROM Product p WHERE p.stok <= :threshold ORDER BY p.stok ASC")
    List<Product> findLowStockProducts(@Param("threshold") int threshold);
}
