package com.belajardocker;

import com.belajardocker.service.ProductService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class SpringMysqlAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(SpringMysqlAppApplication.class, args);
    }

    // Mengisi data awal saat aplikasi pertama kali berjalan
    @Bean
    CommandLineRunner initDatabase(ProductService service) {
        return args -> {
            service.seedData();
            System.out.println("Aplikasi siap. Data awal berhasil dimuat.");
        };
    }
}
