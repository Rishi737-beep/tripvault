CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    created_at DATETIME(6) NOT NULL,
    email VARCHAR(150) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE INDEX idx_users_email (email)
);

CREATE TABLE trips (
    id BIGINT NOT NULL AUTO_INCREMENT,
    budget DECIMAL(15, 2) NULL,
    created_at DATETIME(6) NOT NULL,
    currency VARCHAR(3) NULL,
    description VARCHAR(1000) NULL,
    destination VARCHAR(200) NOT NULL,
    end_date DATE NULL,
    start_date DATE NULL,
    updated_at DATETIME(6) NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_trips_user_id (user_id),
    CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE expenses (
    id BIGINT NOT NULL AUTO_INCREMENT,
    amount DECIMAL(15, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    currency VARCHAR(3) NULL,
    description TEXT NULL,
    expense_date DATE NULL,
    travel_id BIGINT NOT NULL,
    updated_at DATETIME(6) NULL,
    trip_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_expenses_trip_id (trip_id),
    CONSTRAINT fk_expenses_trip FOREIGN KEY (trip_id) REFERENCES trips (id),
    CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users (id)
);
