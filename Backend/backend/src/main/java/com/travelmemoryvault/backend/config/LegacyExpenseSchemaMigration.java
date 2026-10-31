package com.travelmemoryvault.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.regex.Pattern;

@Component
public class LegacyExpenseSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LegacyExpenseSchemaMigration.class);
    private static final Pattern SAFE_IDENTIFIER = Pattern.compile("[A-Za-z0-9_]+");

    private final JdbcTemplate jdbcTemplate;

    public LegacyExpenseSchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        String databaseProduct = jdbcTemplate.execute((ConnectionCallback<String>) connection ->
                connection.getMetaData().getDatabaseProductName());
        if (!"MySQL".equalsIgnoreCase(databaseProduct)) {
            return;
        }

        List<String> legacyConstraints = jdbcTemplate.queryForList("""
                SELECT DISTINCT constraint_name
                FROM information_schema.key_column_usage
                WHERE table_schema = DATABASE()
                  AND table_name = 'expenses'
                  AND column_name = 'travel_id'
                  AND referenced_table_name = 'travels'
                """, String.class);

        for (String constraint : legacyConstraints) {
            if (!SAFE_IDENTIFIER.matcher(constraint).matches()) {
                throw new IllegalStateException("Unexpected legacy database constraint name.");
            }
            jdbcTemplate.execute("ALTER TABLE expenses DROP FOREIGN KEY `" + constraint + "`");
            log.info("Removed obsolete expenses.travel_id foreign key to legacy travels table.");
        }
    }
}
