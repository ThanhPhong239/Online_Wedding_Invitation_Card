-- =====================================================
-- DATABASE SCHEMA: Wedding Invitation System
-- Engine: MySQL 8.0+ / MariaDB 10.5+
-- Charset: utf8mb4 (Hỗ trợ tiếng Việt & Emojis)
-- =====================================================

-- 1. BẢNG KHÁCH MỜI (guests)
CREATE TABLE IF NOT EXISTS `guests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `token` VARCHAR(64) DEFAULT NULL,
  `attendance` ENUM('pending', 'yes', 'no') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_guests_attendance` (`attendance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG LỜI CHÚC (wishes)
CREATE TABLE IF NOT EXISTS `wishes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `guest_id` INT NOT NULL,
  `message` TEXT NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_wishes_guest` (`guest_id`),
  CONSTRAINT `fk_wishes_guest` FOREIGN KEY (`guest_id`) REFERENCES `guests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
