-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 18, 2026 at 09:27 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pos_and_inventory_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `branch_id` int(11) NOT NULL,
  `branch_name` varchar(100) NOT NULL,
  `address` text NOT NULL,
  `contact_number` varchar(20) NOT NULL,
  `opening_time` time NOT NULL,
  `closing_time` time NOT NULL,
  `status` enum('Active','Closed','Suspended') DEFAULT 'Active',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`branch_id`, `branch_name`, `address`, `contact_number`, `opening_time`, `closing_time`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(2, 'FoodParadise - Main Branch', 'Mayor Climaco Avenue, Zamboanga City, Philippines', '+639021468290', '09:00:00', '22:00:00', 'Active', 7, '2026-01-28 16:24:07', '2026-01-28 16:24:07'),
(8, 'FoodParadise - Skillet Branch', 'Placeholder', '+639123765409', '12:00:00', '23:00:00', 'Active', 7, '2026-01-29 04:54:53', '2026-01-29 04:54:53'),
(9, 'Placeholder', 'Placeholder', 'Placeholder', '08:00:00', '22:00:00', 'Active', 7, '2026-02-05 05:52:53', '2026-02-05 05:52:53'),
(10, 'Placeholder', 'Placeholder', '+6356789023', '07:36:00', '21:36:00', 'Active', 7, '2026-02-05 06:37:03', '2026-02-05 06:37:03');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`category_id`, `category_name`, `created_at`, `updated_at`) VALUES
(1, 'Fast Food', '2025-11-30 22:22:33', '2025-11-30 22:22:33'),
(2, 'Filipino Dishes', '2025-11-30 22:22:33', '2025-11-30 22:22:33'),
(3, 'Chinese-Inspired Dishies', '2025-11-30 22:22:33', '2025-11-30 22:22:33'),
(4, 'Western Cuisine', '2025-11-30 22:22:33', '2025-11-30 22:22:33'),
(5, 'Drinks', '2025-11-30 22:22:33', '2025-11-30 22:22:33'),
(6, 'Combo Meals', '2025-11-30 22:22:33', '2025-11-30 22:22:33');

-- --------------------------------------------------------

--
-- Table structure for table `chat_rooms`
--

CREATE TABLE `chat_rooms` (
  `room_id` int(11) NOT NULL,
  `room_name` varchar(255) NOT NULL,
  `room_type` enum('branch','private') NOT NULL DEFAULT 'branch',
  `branch_id` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chat_room_members`
--

CREATE TABLE `chat_room_members` (
  `id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `menu_item_portions`
--

CREATE TABLE `menu_item_portions` (
  `product_id` int(11) NOT NULL,
  `portion_id` int(11) NOT NULL,
  `qty` decimal(10,3) NOT NULL DEFAULT 1.000
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `message_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `message_type` enum('text','image','file') DEFAULT 'text',
  `attachment_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `message_status`
--

CREATE TABLE `message_status` (
  `id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('sent','delivered','seen') DEFAULT 'sent',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `order_id` int(11) NOT NULL,
  `order_date` datetime NOT NULL DEFAULT current_timestamp(),
  `total_amount` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`order_id`, `order_date`, `total_amount`) VALUES
(1, '2025-12-03 07:54:46', 85.00),
(2, '2025-12-03 07:55:24', 85.00),
(3, '2025-12-03 08:07:46', 170.00),
(4, '2025-12-03 08:09:08', 255.00),
(5, '2025-12-03 08:17:03', 25.00),
(6, '2025-12-03 08:17:24', 25.00),
(7, '2025-12-03 09:41:12', 50.00),
(8, '2025-12-03 12:49:39', 170.00),
(9, '2025-12-03 13:22:28', 195.00),
(10, '2025-12-03 13:22:56', 170.00),
(11, '2025-12-03 13:24:20', 195.00),
(12, '2025-12-08 20:39:08', 170.00),
(13, '2025-12-08 21:03:23', 170.00),
(14, '2025-12-08 21:04:26', 220.00),
(15, '2025-12-08 21:09:28', 220.00),
(16, '2025-12-08 21:11:28', 170.00),
(17, '2025-12-08 21:13:08', 125.00),
(18, '2025-12-08 21:21:37', 100.00),
(19, '2025-12-08 21:24:35', 255.00),
(20, '2025-12-09 12:58:45', 170.00),
(21, '2025-12-09 13:06:45', 85.00),
(22, '2025-12-09 13:08:51', 85.00),
(23, '2025-12-09 20:28:52', 255.00),
(24, '2025-12-09 20:35:33', 170.00),
(25, '2025-12-09 20:36:15', 170.00),
(26, '2025-12-09 20:49:43', 170.00),
(27, '2025-12-09 21:07:31', 85.00),
(28, '2025-12-09 21:14:04', 25.00),
(29, '2025-12-09 21:29:37', 170.00),
(30, '2025-12-09 21:30:12', 85.00),
(31, '2025-12-09 21:30:30', 85.00),
(32, '2025-12-10 12:27:31', 85.00),
(33, '2025-12-10 12:27:58', 85.00),
(34, '2025-12-10 12:29:40', 50.00),
(35, '2025-12-10 12:34:12', 445.00),
(36, '2025-12-10 12:36:30', 1675.00),
(37, '2025-12-10 12:47:46', 1550.00),
(38, '2025-12-10 12:49:08', 1050.00),
(39, '2025-12-10 12:52:26', 950.00),
(40, '2025-12-10 14:27:49', 455.00),
(41, '2025-12-10 14:28:56', 210.00),
(42, '2025-12-10 14:47:26', 220.00),
(43, '2025-12-10 14:48:12', 220.00),
(44, '2025-12-10 14:50:17', 170.00),
(45, '2025-12-10 21:16:06', 170.00),
(46, '2025-12-10 21:16:24', 170.00),
(47, '2025-12-10 21:17:30', 170.00),
(48, '2025-12-10 21:18:06', 295.00),
(49, '2025-12-10 21:18:27', 295.00),
(50, '2025-12-10 21:18:57', 295.00),
(51, '2025-12-10 21:19:46', 295.00),
(52, '2025-12-10 21:21:21', 345.00),
(53, '2025-12-10 21:21:53', 345.00),
(54, '2025-12-10 21:23:11', 210.00),
(55, '2025-12-10 21:24:04', 50.00),
(56, '2025-12-10 21:26:08', 1035.00),
(57, '2025-12-10 21:29:23', 1350.00),
(58, '2025-12-10 21:30:52', 1350.00),
(59, '2025-12-10 21:44:36', 480.00),
(60, '2025-12-10 21:46:01', 3700.00),
(61, '2025-12-10 21:48:00', 1600.00),
(62, '2025-12-10 21:52:34', 420.00),
(63, '2025-12-10 21:58:45', 670.00),
(64, '2025-12-10 23:30:28', 85.00),
(65, '2025-12-10 23:30:46', 85.00),
(66, '2025-12-10 23:31:13', 85.00),
(67, '2025-12-10 23:31:41', 85.00),
(68, '2025-12-10 23:36:29', 85.00),
(69, '2025-12-10 23:37:26', 85.00),
(70, '2025-12-10 23:37:42', 85.00),
(71, '2025-12-10 23:38:14', 85.00),
(72, '2025-12-10 23:38:28', 85.00),
(73, '2025-12-10 23:43:44', 210.00),
(74, '2025-12-10 23:44:02', 420.00),
(75, '2025-12-10 23:47:19', 85.00),
(76, '2025-12-11 00:38:53', 320.00),
(77, '2025-12-11 12:02:31', 320.00),
(78, '2025-12-11 12:03:16', 85.00),
(79, '2025-12-11 12:04:03', 170.00),
(80, '2025-12-11 12:05:56', 345.00),
(81, '2025-12-11 12:07:30', 345.00),
(82, '2025-12-11 12:07:47', 295.00),
(83, '2025-12-11 12:08:15', 855.00),
(84, '2025-12-11 12:11:41', 425.00),
(85, '2025-12-11 12:13:54', 345.00),
(86, '2025-12-11 12:36:04', 170.00),
(87, '2025-12-11 12:37:05', 85.00),
(88, '2025-12-11 12:40:41', 85.00),
(89, '2025-12-11 12:41:08', 85.00),
(90, '2025-12-11 12:44:32', 85.00),
(91, '2025-12-11 12:45:08', 260.00),
(92, '2025-12-11 12:45:37', 50.00),
(93, '2025-12-11 12:46:15', 50.00),
(94, '2025-12-11 12:46:40', 50.00),
(95, '2025-12-11 12:47:28', 170.00),
(96, '2025-12-11 12:49:54', 170.00),
(97, '2025-12-11 12:57:50', 170.00),
(98, '2025-12-11 13:21:34', 100.00),
(99, '2025-12-11 13:22:28', 100.00),
(100, '2025-12-11 15:18:27', 170.00),
(101, '2025-12-11 15:18:52', 345.00),
(102, '2025-12-11 15:22:48', 330.00),
(103, '2025-12-11 16:29:03', 170.00),
(104, '2025-12-11 16:29:31', 85.00),
(105, '2025-12-11 16:29:44', 85.00),
(106, '2025-12-11 16:31:31', 85.00),
(107, '2025-12-11 17:33:37', 85.00),
(108, '2025-12-11 17:34:11', 85.00),
(109, '2025-12-11 17:39:34', 85.00);

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `order_item_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`order_item_id`, `order_id`, `product_id`, `quantity`) VALUES
(1, 1, 2, 1),
(2, 2, 2, 1),
(3, 3, 2, 2),
(4, 4, 2, 3),
(5, 5, 10, 1),
(6, 6, 10, 1),
(7, 7, 3, 1),
(8, 8, 2, 2),
(9, 9, 2, 2),
(10, 9, 10, 1),
(11, 10, 2, 2),
(12, 11, 2, 2),
(13, 11, 10, 1),
(14, 12, 2, 2),
(15, 13, 2, 2),
(16, 14, 10, 2),
(17, 14, 2, 2),
(18, 15, 2, 2),
(19, 15, 10, 2),
(20, 16, 2, 2),
(21, 17, 10, 5),
(22, 18, 10, 4),
(23, 19, 2, 3),
(24, 20, 2, 2),
(25, 21, 2, 1),
(26, 22, 2, 1),
(27, 23, 2, 3),
(28, 24, 2, 2),
(29, 25, 2, 2),
(30, 26, 2, 2),
(31, 27, 2, 1),
(32, 28, 10, 1),
(33, 29, 2, 2),
(34, 30, 2, 1),
(35, 31, 2, 1),
(36, 32, 2, 1),
(37, 33, 2, 1),
(38, 34, 10, 2),
(39, 35, 2, 2),
(40, 35, 3, 2),
(41, 35, 10, 3),
(42, 35, 15, 2),
(43, 36, 2, 5),
(44, 36, 3, 10),
(45, 36, 10, 10),
(46, 36, 15, 10),
(47, 37, 2, 5),
(48, 37, 3, 10),
(49, 37, 10, 5),
(50, 37, 15, 10),
(51, 38, 2, 5),
(52, 38, 3, 5),
(53, 38, 10, 5),
(54, 38, 15, 5),
(55, 39, 2, 5),
(56, 39, 3, 5),
(57, 39, 10, 5),
(58, 39, 15, 3),
(59, 40, 2, 3),
(60, 40, 3, 2),
(61, 40, 10, 2),
(62, 40, 15, 1),
(63, 41, 2, 1),
(64, 41, 3, 1),
(65, 41, 10, 1),
(66, 41, 15, 1),
(67, 42, 2, 2),
(68, 42, 3, 1),
(69, 43, 2, 2),
(70, 43, 3, 1),
(71, 44, 2, 2),
(72, 45, 2, 2),
(73, 46, 2, 2),
(74, 47, 2, 2),
(75, 48, 2, 2),
(76, 48, 10, 1),
(77, 48, 15, 1),
(78, 48, 3, 1),
(79, 49, 2, 2),
(80, 49, 3, 1),
(81, 49, 10, 1),
(82, 49, 15, 1),
(83, 50, 2, 2),
(84, 50, 3, 1),
(85, 50, 10, 1),
(86, 50, 15, 1),
(87, 51, 2, 2),
(88, 51, 3, 1),
(89, 51, 10, 1),
(90, 51, 15, 1),
(91, 52, 2, 2),
(92, 52, 3, 1),
(93, 52, 10, 1),
(94, 52, 15, 2),
(95, 53, 2, 2),
(96, 53, 3, 1),
(97, 53, 10, 1),
(98, 53, 15, 2),
(99, 54, 2, 1),
(100, 54, 3, 1),
(101, 54, 10, 1),
(102, 54, 15, 1),
(103, 55, 15, 1),
(104, 56, 15, 2),
(105, 56, 10, 5),
(106, 56, 2, 6),
(107, 56, 3, 6),
(108, 57, 2, 10),
(109, 57, 10, 20),
(110, 58, 2, 10),
(111, 58, 10, 20),
(112, 59, 2, 3),
(113, 59, 3, 1),
(114, 59, 15, 1),
(115, 59, 10, 5),
(116, 60, 15, 15),
(117, 60, 10, 20),
(118, 60, 3, 15),
(119, 60, 2, 20),
(120, 61, 2, 10),
(121, 61, 3, 5),
(122, 61, 15, 5),
(123, 61, 10, 10),
(124, 62, 15, 2),
(125, 62, 10, 2),
(126, 62, 3, 2),
(127, 62, 2, 2),
(128, 63, 2, 2),
(129, 63, 3, 3),
(130, 63, 10, 4),
(131, 63, 15, 5),
(132, 64, 2, 1),
(133, 65, 2, 1),
(134, 66, 2, 1),
(135, 67, 2, 1),
(136, 68, 2, 1),
(137, 69, 2, 1),
(138, 70, 2, 1),
(139, 71, 2, 1),
(140, 72, 2, 1),
(141, 73, 2, 1),
(142, 73, 3, 1),
(143, 73, 10, 1),
(144, 73, 15, 1),
(145, 74, 2, 2),
(146, 74, 3, 2),
(147, 74, 10, 2),
(148, 74, 15, 2),
(149, 75, 2, 1),
(150, 76, 2, 2),
(151, 76, 3, 1),
(152, 76, 10, 2),
(153, 76, 15, 1),
(154, 77, 2, 2),
(155, 77, 3, 1),
(156, 77, 15, 1),
(157, 77, 10, 2),
(158, 78, 2, 1),
(159, 79, 2, 2),
(160, 80, 2, 2),
(161, 80, 3, 1),
(162, 80, 10, 1),
(163, 80, 15, 2),
(164, 81, 15, 1),
(165, 81, 10, 1),
(166, 81, 3, 2),
(167, 81, 2, 2),
(168, 82, 2, 2),
(169, 82, 3, 1),
(170, 82, 10, 1),
(171, 82, 15, 1),
(172, 83, 15, 6),
(173, 83, 10, 6),
(174, 83, 3, 3),
(175, 83, 2, 3),
(176, 84, 2, 5),
(177, 85, 2, 2),
(178, 85, 3, 1),
(179, 85, 10, 1),
(180, 85, 15, 2),
(181, 86, 2, 2),
(182, 87, 2, 1),
(183, 88, 2, 1),
(184, 89, 2, 1),
(185, 90, 2, 1),
(186, 91, 2, 1),
(187, 91, 3, 2),
(188, 91, 10, 1),
(189, 91, 15, 1),
(190, 92, 15, 1),
(191, 93, 15, 1),
(192, 94, 15, 1),
(193, 95, 2, 2),
(194, 96, 2, 2),
(195, 97, 2, 2),
(196, 98, 10, 4),
(197, 99, 15, 2),
(198, 100, 2, 2),
(199, 101, 2, 2),
(200, 101, 3, 1),
(201, 101, 10, 1),
(202, 101, 15, 2),
(203, 102, 2, 1),
(204, 102, 3, 1),
(205, 102, 10, 1),
(206, 102, 8, 1),
(207, 102, 4, 1),
(208, 102, 15, 1),
(209, 102, 13, 1),
(210, 103, 2, 2),
(211, 104, 2, 1),
(212, 105, 2, 1),
(213, 106, 2, 1),
(214, 107, 2, 1),
(215, 108, 2, 1),
(216, 109, 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `portions`
--

CREATE TABLE `portions` (
  `portion_id` int(11) NOT NULL,
  `portion_name` varchar(100) NOT NULL,
  `unit` varchar(10) DEFAULT NULL,
  `formula_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`formula_json`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `portions`
--

INSERT INTO `portions` (`portion_id`, `portion_name`, `unit`, `formula_json`) VALUES
(1, 'Spaghetti Portion', NULL, '[{\"raw_item_id\":4,\"qty\":0.9}]'),
(2, 'Fried Rice Portion', NULL, '[{\"raw_item_id\":1,\"qty\":0.2},{\"raw_item_id\":6,\"qty\":0.4}]'),
(3, 'Burger Portion', NULL, '[{\"raw_item_id\":5,\"qty\":1},{\"raw_item_id\":7,\"qty\":1}]'),
(4, 'Adobo Portion', NULL, '[{\"raw_item_id\":8,\"qty\":0.25}]'),
(5, 'Fried Chicken Portion', NULL, '[{\"raw_item_id\":8,\"qty\":0.25}]'),
(6, 'Coke Portion', NULL, '[{\"raw_item_id\":9,\"qty\":1}]'),
(7, 'Cheeseburger Portion', NULL, '[{\"raw_item_id\":5,\"qty\":1},{\"raw_item_id\":7,\"qty\":1},{\"raw_item_id\":10,\"qty\":1}]');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `branch_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `category_id` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `image_name` varchar(255) DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `status` enum('available','unavailable') NOT NULL DEFAULT 'available',
  `approval_status` enum('PENDING','APPROVED','DECLINED') DEFAULT 'PENDING',
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `decline_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `created_by`, `branch_id`, `product_name`, `category_id`, `price`, `image_name`, `image_path`, `status`, `approval_status`, `reviewed_by`, `reviewed_at`, `decline_reason`, `created_at`, `updated_at`) VALUES
(2, 10, 2, 'Spaghetti', 4, 85.00, 'food-hero.jpg', '/uploads/1764554268639.jpg', 'available', 'APPROVED', 7, '2026-02-17 01:48:52', NULL, '2025-12-01 01:57:48', '2026-02-16 17:48:52'),
(3, 10, 2, 'Adobo', 2, 50.00, NULL, NULL, 'unavailable', 'DECLINED', 7, '2026-02-17 01:42:53', NULL, '2025-12-01 02:12:02', '2026-02-16 17:42:53'),
(4, 10, 2, 'Coke', 5, 25.00, NULL, NULL, 'available', 'APPROVED', 7, '2026-02-17 06:11:56', NULL, '2025-12-01 02:26:26', '2026-02-16 22:11:56'),
(5, 10, 2, 'Somai', 3, 50.00, NULL, NULL, 'available', 'APPROVED', 7, '2026-02-17 06:11:54', NULL, '2025-12-01 02:44:08', '2026-02-16 22:11:54'),
(6, 10, 2, 'Kaldereta', 2, 35.00, NULL, NULL, 'available', 'DECLINED', 7, '2026-02-17 01:38:34', NULL, '2025-12-01 07:41:47', '2026-02-16 17:38:34'),
(7, 10, 2, 'Lomi', 2, 25.00, NULL, NULL, 'available', 'APPROVED', 7, '2026-02-17 06:11:13', NULL, '2025-12-01 07:42:36', '2026-02-16 22:11:13'),
(8, 10, 2, 'Fried Chicken', 1, 45.00, NULL, NULL, 'available', 'DECLINED', 7, '2026-02-17 01:47:57', 'lower the price and add image', '2025-12-01 07:43:25', '2026-02-16 17:47:57'),
(10, 10, 2, 'Burger', 1, 25.00, NULL, NULL, 'available', 'APPROVED', 7, '2026-02-17 06:11:03', NULL, '2025-12-03 00:15:34', '2026-02-16 22:11:03'),
(11, 10, 2, 'Hotdog', 1, 25.00, NULL, NULL, 'available', 'DECLINED', 7, '2026-02-17 01:46:05', NULL, '2025-12-03 00:18:47', '2026-02-16 17:46:05'),
(13, 10, 2, 'Cheeseburger', 1, 50.00, NULL, NULL, 'available', 'APPROVED', 7, '2026-02-17 06:11:05', NULL, '2025-12-03 05:29:36', '2026-02-16 22:11:05'),
(14, 10, 2, 'Corndog', 1, 20.00, 'RobloxScreenShot20231113_214431471.png', '/uploads/1764739819598.png', 'available', 'DECLINED', 7, '2026-02-17 01:33:38', NULL, '2025-12-03 05:30:19', '2026-02-16 17:33:38'),
(15, 10, 2, 'Fried Rice', 4, 50.00, NULL, NULL, 'available', 'DECLINED', 7, '2026-02-17 01:41:45', NULL, '2025-12-10 04:33:34', '2026-02-16 17:41:45'),
(16, 10, 2, 'French Fries', 1, 25.00, 'download (39).jpg', '/uploads/1771238740246.jpg', 'available', 'APPROVED', 7, '2026-02-17 01:24:04', NULL, '2026-02-16 10:45:40', '2026-02-16 17:24:04'),
(17, 13, 8, 'Chocolate Cake', 4, 50.00, 'images (4).jpg', '/uploads/1771264319954.jpg', 'available', 'APPROVED', 7, '2026-02-17 01:52:51', NULL, '2026-02-16 17:51:59', '2026-02-16 17:52:51'),
(18, 13, 8, 'Chicken BBQ', 2, 75.00, 'download (40).jpg', '/uploads/1771264646716.jpg', 'available', 'PENDING', NULL, NULL, NULL, '2026-02-16 17:57:26', '2026-02-16 17:57:26');

-- --------------------------------------------------------

--
-- Table structure for table `raw_items`
--

CREATE TABLE `raw_items` (
  `raw_item_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `unit` varchar(10) NOT NULL,
  `quantity` decimal(10,2) DEFAULT NULL,
  `supplier` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `raw_items`
--

INSERT INTO `raw_items` (`raw_item_id`, `name`, `unit`, `quantity`, `supplier`, `created_at`) VALUES
(1, 'Rice', 'kg', 30.40, 'Rice Corn Corp.', '2025-12-02 16:21:06'),
(2, 'Onion', 'kg', 35.50, 'Onion Field Corp.', '2025-12-02 16:25:38'),
(3, 'Potato', 'kg', 15.00, 'Potato Corp.', '2025-12-02 16:34:51'),
(4, 'Pasta', 'grams', 488.40, 'Pasta Pasta Corp.', '2025-12-02 16:45:24'),
(5, 'Patty', 'pcs', 39.00, 'Mr. Burger Corp.', '2025-12-02 16:45:24'),
(6, 'Corn', 'kg', 69.80, 'Corn Corp.', '2025-12-02 17:32:35'),
(7, 'Bun', 'pcs', 84.00, 'Bun Bun Corp.', '2025-12-02 22:33:14'),
(8, 'Chicken', 'kg', 26.50, 'Chicken Corp.', '2025-12-03 01:40:04'),
(9, 'Coke', 'L', 49.50, 'Soke Corp.', '2025-12-03 04:54:30'),
(10, 'Cheese', 'pcs', 199.00, 'Chunky Cheese Corp.', '2025-12-11 07:21:40');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`role_id`, `role_name`) VALUES
(1, 'cashier'),
(2, 'admin'),
(3, 'super_admin');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int(11) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `status` enum('Activate','Deactivate') DEFAULT 'Activate',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `branch_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `full_name`, `username`, `password`, `role_id`, `created_by`, `status`, `created_at`, `updated_at`, `branch_id`) VALUES
(1, 'Jackson', 'Cashier3', 'superpassword', 1, NULL, 'Activate', '2025-11-28 23:57:40', '2026-02-15 08:53:33', 8),
(2, 'Admin User', 'admin', 'adminpassword', 2, 1, 'Activate', '2025-11-28 23:58:29', '2026-02-15 08:15:14', 2),
(4, 'Admin', 'admin2', '$2b$10$yszbqJ4ZIDVrX5NZPo1D5Oxei7AafbXF1i89awG5DKTWA8wHcMhx2', 2, NULL, 'Activate', '2025-11-29 08:52:32', '2026-02-15 08:03:39', 2),
(5, 'Jack', 'Cashier1', '$2b$10$sVcMKaZnRhm78HTjb3tdAuDt5IH0P6LxhN87fD5vwI4BE4CpScIWC', 1, 4, 'Activate', '2025-11-30 13:02:38', '2026-02-15 09:41:24', 2),
(6, 'Rod ', 'Cashier2', '$2b$10$f9.1lvjiouhXwE9DuiNtQ.YLuAv8sgMaENh4lfKJfKVtx.zFXrFZG', 1, 4, 'Activate', '2025-11-30 13:20:13', '2026-02-15 08:36:16', 8),
(7, 'Super_Admin', 'superadmin2', '$2b$10$zmCatHSsdFQbWOTMxSnzmOCERsOXZfFXWtRRwbTLAK6qYUf6HrM1K', 3, NULL, 'Activate', '2025-12-02 08:55:07', '2025-12-02 09:14:29', NULL),
(8, 'Claire', 'Cashier4', '$2b$10$4KLaygEXgaCY3m51T9ifbO0ENtAjsqwM2sT3s1xBjPqrBjza95UEK', 1, 4, 'Activate', '2025-12-03 00:12:39', '2026-02-17 12:30:02', 8),
(9, 'Rod Angelo ', 'Cashier 5', '$2b$10$TF5ljqLcrbDVLNluE7REiOCtglj7sVzTXWQO46QNbL4rQMIXxZ2m.', 1, 4, 'Activate', '2026-01-28 09:38:41', '2026-02-15 08:32:13', 8),
(10, 'Rod Angelo', 'Admin3', '$2b$10$2mIhlFIaFa6VzHjSUocBWe4A7YrEfnQkeQy8w7MjslbGRT5ZujiKS', 2, 7, 'Activate', '2026-02-03 09:23:07', '2026-02-16 10:03:12', 2),
(11, 'Alexandra Steffi', 'Admin 4', '$2b$10$8wtUCYCyvgomOWXGmhWhfe.2fGy4RMLd9/Q2OT8qPcpOFVt4ohsxG', 2, 7, 'Activate', '2026-02-05 03:16:31', '2026-02-18 07:47:43', 8),
(12, 'Jake Morales', 'Admin 5', '$2b$10$FycxZ5xV2OI.4q25scseUO2MIMw1y7gxAjcqIGqaNIZ3nXh72Vr3C', 2, 7, 'Activate', '2026-02-05 03:23:19', '2026-02-05 03:23:19', 2),
(13, 'Job Morales', 'Admin 6', '$2b$10$n3lfUyf4ib4Kx724b8YTNeYEN063wI4Ps89wNPBH5jRcuVLGqZdQ6', 2, 7, 'Activate', '2026-02-05 03:25:25', '2026-02-16 17:50:19', 8),
(14, 'John Doe', 'Admin 7', '$2b$10$G9dFYYtSI22GmrVzFScdQ.7O5wkUGnUG60acQ3t04t0S12/ilCWLG', 2, 7, 'Deactivate', '2026-02-05 06:38:46', '2026-02-05 06:39:02', 2),
(15, 'Ernesto Morales', 'Cashier 6', '$2b$10$W5bZEtTS.5VLTTAxQ0/sze3cxzcFy2p0uZbxyFRMPnHRlwIVpDBx6', 1, 7, 'Activate', '2026-02-06 03:12:30', '2026-02-17 14:30:29', 2),
(17, 'Admin123', 'admin8', '$2b$10$ymOxJker1VRlsRCGSGc5HemBmdxY8jQGYuC4rIikIqMyXNfkQ0.aS', 3, NULL, '', '2026-02-07 01:36:39', '2026-02-07 01:36:39', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`branch_id`),
  ADD KEY `fk_branch_creator` (`created_by`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`category_id`);

--
-- Indexes for table `chat_rooms`
--
ALTER TABLE `chat_rooms`
  ADD PRIMARY KEY (`room_id`),
  ADD KEY `fk_chat_branch` (`branch_id`),
  ADD KEY `fk_chat_creator` (`created_by`);

--
-- Indexes for table `chat_room_members`
--
ALTER TABLE `chat_room_members`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `room_id` (`room_id`,`user_id`),
  ADD KEY `fk_member_user` (`user_id`);

--
-- Indexes for table `menu_item_portions`
--
ALTER TABLE `menu_item_portions`
  ADD PRIMARY KEY (`product_id`,`portion_id`),
  ADD KEY `portion_id` (`portion_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`message_id`),
  ADD KEY `fk_message_room` (`room_id`),
  ADD KEY `fk_message_sender` (`sender_id`);

--
-- Indexes for table `message_status`
--
ALTER TABLE `message_status`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `message_id` (`message_id`,`user_id`),
  ADD KEY `fk_status_user` (`user_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `portions`
--
ALTER TABLE `portions`
  ADD PRIMARY KEY (`portion_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `fk_category` (`category_id`),
  ADD KEY `fk_menu_reviewed_by` (`reviewed_by`),
  ADD KEY `fk_products_created_by` (`created_by`),
  ADD KEY `fk_products_branch` (`branch_id`);

--
-- Indexes for table `raw_items`
--
ALTER TABLE `raw_items`
  ADD PRIMARY KEY (`raw_item_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `role_id` (`role_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `fk_users_branch` (`branch_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `branches`
--
ALTER TABLE `branches`
  MODIFY `branch_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `chat_rooms`
--
ALTER TABLE `chat_rooms`
  MODIFY `room_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chat_room_members`
--
ALTER TABLE `chat_room_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `message_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `message_status`
--
ALTER TABLE `message_status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=110;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `order_item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=217;

--
-- AUTO_INCREMENT for table `portions`
--
ALTER TABLE `portions`
  MODIFY `portion_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `raw_items`
--
ALTER TABLE `raw_items`
  MODIFY `raw_item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `branches`
--
ALTER TABLE `branches`
  ADD CONSTRAINT `fk_branch_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `chat_rooms`
--
ALTER TABLE `chat_rooms`
  ADD CONSTRAINT `fk_chat_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_chat_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `chat_room_members`
--
ALTER TABLE `chat_room_members`
  ADD CONSTRAINT `fk_member_room` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`room_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_member_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `menu_item_portions`
--
ALTER TABLE `menu_item_portions`
  ADD CONSTRAINT `menu_item_portions_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `menu_item_portions_ibfk_2` FOREIGN KEY (`portion_id`) REFERENCES `portions` (`portion_id`) ON DELETE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `fk_message_room` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`room_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `message_status`
--
ALTER TABLE `message_status`
  ADD CONSTRAINT `fk_status_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`message_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_status_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_menu_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_products_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_products_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`branch_id`),
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`),
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
