CREATE TABLE `content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`title` varchar(255),
	`description` text,
	`contentType` enum('photo','video','post') NOT NULL,
	`mediaUrl` text NOT NULL,
	`thumbnailUrl` text,
	`isExclusive` boolean NOT NULL DEFAULT false,
	`viewCount` int NOT NULL DEFAULT 0,
	`likeCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_gateway_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gateway` enum('novaplex','blackout','pushinpay') NOT NULL,
	`apiKey` text NOT NULL,
	`apiSecret` text,
	`webhookSecret` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_gateway_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_gateway_credentials_gateway_unique` UNIQUE(`gateway`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(64) NOT NULL,
	`displayName` varchar(255) NOT NULL,
	`bio` text,
	`profilePicUrl` text,
	`bannerUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`totalSubscribers` int NOT NULL DEFAULT 0,
	`totalPosts` int NOT NULL DEFAULT 0,
	`totalMedia` int NOT NULL DEFAULT 0,
	`totalExclusive` int NOT NULL DEFAULT 0,
	`totalLikes` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`priceInCents` int NOT NULL,
	`billingCycle` enum('monthly','quarterly','yearly','lifetime') NOT NULL DEFAULT 'monthly',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriberId` int NOT NULL,
	`profileId` int NOT NULL,
	`planId` int NOT NULL,
	`status` enum('active','cancelled','expired','pending') NOT NULL DEFAULT 'pending',
	`externalSubscriptionId` varchar(255),
	`paymentGateway` enum('novaplex','blackout','pushinpay'),
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`renewalDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int,
	`profileId` int NOT NULL,
	`subscriberId` int NOT NULL,
	`amountInCents` int NOT NULL,
	`platformFeeInCents` int NOT NULL,
	`creatorEarningsInCents` int NOT NULL,
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`paymentGateway` enum('novaplex','blackout','pushinpay') NOT NULL,
	`externalTransactionId` varchar(255),
	`webhookPayload` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`balanceInCents` int NOT NULL DEFAULT 0,
	`totalEarningsInCents` int NOT NULL DEFAULT 0,
	`totalWithdrawnInCents` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wallets_id` PRIMARY KEY(`id`),
	CONSTRAINT `wallets_profileId_unique` UNIQUE(`profileId`)
);
--> statement-breakpoint
CREATE INDEX `content_profileId_idx` ON `content` (`profileId`);--> statement-breakpoint
CREATE INDEX `profiles_userId_idx` ON `profiles` (`userId`);--> statement-breakpoint
CREATE INDEX `profiles_username_idx` ON `profiles` (`username`);--> statement-breakpoint
CREATE INDEX `subscription_plans_profileId_idx` ON `subscription_plans` (`profileId`);--> statement-breakpoint
CREATE INDEX `subscriptions_subscriberId_idx` ON `subscriptions` (`subscriberId`);--> statement-breakpoint
CREATE INDEX `subscriptions_profileId_idx` ON `subscriptions` (`profileId`);--> statement-breakpoint
CREATE INDEX `transactions_profileId_idx` ON `transactions` (`profileId`);--> statement-breakpoint
CREATE INDEX `transactions_subscriberId_idx` ON `transactions` (`subscriberId`);--> statement-breakpoint
CREATE INDEX `transactions_status_idx` ON `transactions` (`status`);--> statement-breakpoint
CREATE INDEX `wallets_profileId_idx` ON `wallets` (`profileId`);