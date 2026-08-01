package com.belajardocker;
 
import com.belajardocker.service.ProductService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
 
@SpringBootApplication
public class SpringVolumeDemoApplication {
 
    public static void main(String[] args) {
        SpringApplication.run(SpringVolumeDemoApplication.class, args);
    }
 
    @Bean
    CommandLineRunner init(ProductService svc) {
        return args -> svc.seedIfEmpty();
    }
}