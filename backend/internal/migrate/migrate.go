package migrate

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

const bootstrapSQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE schema_migrations IS '已应用的 SQL 迁移版本（文件名去掉 .up.sql 的版本键）';
COMMENT ON COLUMN schema_migrations.version IS '迁移版本键，例如 000013_marketplace_local_devmcp';
COMMENT ON COLUMN schema_migrations.applied_at IS '该版本成功应用的时间（UTC）';
`

type Migrator struct {
	pool *pgxpool.Pool
	dir  string
}

func New(pool *pgxpool.Pool, dir string) *Migrator {
	return &Migrator{pool: pool, dir: dir}
}

func (m *Migrator) EnsureTable(ctx context.Context) error {
	_, err := m.pool.Exec(ctx, bootstrapSQL)
	return err
}

func (m *Migrator) applied(ctx context.Context) (map[string]struct{}, error) {
	rows, err := m.pool.Query(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]struct{}{}
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		out[v] = struct{}{}
	}
	return out, rows.Err()
}

func (m *Migrator) listUpFiles() ([]string, error) {
	entries, err := os.ReadDir(m.dir)
	if err != nil {
		return nil, err
	}
	var files []string
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || !strings.HasSuffix(name, ".up.sql") {
			continue
		}
		files = append(files, name)
	}
	sort.Strings(files)
	return files, nil
}

func versionOf(filename string) string {
	return strings.TrimSuffix(filename, ".up.sql")
}

func (m *Migrator) hasTenants(ctx context.Context) (bool, error) {
	var ok bool
	err := m.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='tenants')`).Scan(&ok)
	return ok, err
}

// Baseline marks every current *.up.sql as applied without executing SQL.
// Use once on databases that were migrated manually before schema_migrations existed.
func (m *Migrator) Baseline(ctx context.Context) (int, error) {
	if err := m.EnsureTable(ctx); err != nil {
		return 0, err
	}
	applied, err := m.applied(ctx)
	if err != nil {
		return 0, err
	}
	files, err := m.listUpFiles()
	if err != nil {
		return 0, err
	}
	n := 0
	for _, name := range files {
		v := versionOf(name)
		if _, ok := applied[v]; ok {
			continue
		}
		if _, err := m.pool.Exec(ctx, `INSERT INTO schema_migrations(version) VALUES($1)`, v); err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}

// Up applies pending *.up.sql files in lexical order.
// If schema_migrations is empty but tenants already exist, it auto-baselines first.
func (m *Migrator) Up(ctx context.Context) ([]string, error) {
	if err := m.EnsureTable(ctx); err != nil {
		return nil, err
	}
	applied, err := m.applied(ctx)
	if err != nil {
		return nil, err
	}
	if len(applied) == 0 {
		exists, err := m.hasTenants(ctx)
		if err != nil {
			return nil, err
		}
		if exists {
			if _, err := m.Baseline(ctx); err != nil {
				return nil, fmt.Errorf("auto-baseline existing database: %w", err)
			}
			applied, err = m.applied(ctx)
			if err != nil {
				return nil, err
			}
		}
	}
	files, err := m.listUpFiles()
	if err != nil {
		return nil, err
	}
	var ran []string
	for _, name := range files {
		v := versionOf(name)
		if _, ok := applied[v]; ok {
			continue
		}
		raw, err := os.ReadFile(filepath.Join(m.dir, name))
		if err != nil {
			return ran, err
		}
		tx, err := m.pool.Begin(ctx)
		if err != nil {
			return ran, err
		}
		if _, err := tx.Exec(ctx, string(raw)); err != nil {
			_ = tx.Rollback(ctx)
			return ran, fmt.Errorf("%s: %w", name, err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations(version) VALUES($1)`, v); err != nil {
			_ = tx.Rollback(ctx)
			return ran, fmt.Errorf("%s record: %w", name, err)
		}
		if err := tx.Commit(ctx); err != nil {
			return ran, err
		}
		ran = append(ran, v)
	}
	return ran, nil
}
