CREATE TABLE trip_photos (
    id BIGINT NOT NULL AUTO_INCREMENT,
    storage_key VARCHAR(80) NOT NULL,
    content_type VARCHAR(30) NOT NULL,
    file_size BIGINT NOT NULL,
    trip_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_trip_photos_storage_key UNIQUE (storage_key),
    INDEX idx_trip_photos_trip_id (trip_id),
    CONSTRAINT fk_trip_photos_trip FOREIGN KEY (trip_id) REFERENCES trips (id)
) ENGINE=InnoDB;
