"""
Polygon + Route Corridor Matching Tables

Creates:
  - trip_polygons        Driver-drawn pickup/destination service area polygons
  - trip_route_geometry  Google Directions LINESTRING + 3KM buffer corridor
  - customer_locations   Live customer GPS for corridor membership checks

Revision ID: 001_polygon_corridor
Revises: (initial)
Create Date: 2026-06-05
"""
from alembic import op
import sqlalchemy as sa
import geoalchemy2

revision = "001_polygon_corridor"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure PostGIS is enabled
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    # ── trip_polygons ─────────────────────────────────────────────────────────
    op.create_table(
        "trip_polygons",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True),
                  primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("trip_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("trips.id", ondelete="CASCADE"),
                  nullable=False, unique=True, index=True),
        # Pickup service area polygon
        sa.Column(
            "pickup_polygon",
            geoalchemy2.types.Geometry(geometry_type="POLYGON", srid=4326),
            nullable=True,
        ),
        # Destination service area polygon
        sa.Column(
            "destination_polygon",
            geoalchemy2.types.Geometry(geometry_type="POLYGON", srid=4326),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_trip_polygons_trip_id", "trip_polygons", ["trip_id"])

    # ── trip_route_geometry ───────────────────────────────────────────────────
    op.create_table(
        "trip_route_geometry",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True),
                  primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("trip_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("trips.id", ondelete="CASCADE"),
                  nullable=False, unique=True, index=True),
        # Google Directions polyline as PostGIS LINESTRING
        sa.Column(
            "route_linestring",
            geoalchemy2.types.Geometry(geometry_type="LINESTRING", srid=4326),
            nullable=True,
        ),
        # 3 KM buffer around route — auto-generated via ST_Buffer
        sa.Column(
            "route_buffer",
            geoalchemy2.types.Geometry(geometry_type="POLYGON", srid=4326),
            nullable=True,
        ),
        sa.Column("encoded_polyline", sa.Text, nullable=True),
        sa.Column("distance_km", sa.Float, nullable=True),
        sa.Column("duration_minutes", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_trip_route_geometry_trip_id", "trip_route_geometry", ["trip_id"])

    # ── customer_locations ────────────────────────────────────────────────────
    op.create_table(
        "customer_locations",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True),
                  primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("customer_id", sa.dialects.postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"),
                  nullable=False, unique=True, index=True),
        sa.Column(
            "location",
            geoalchemy2.types.Geography(geometry_type="POINT", srid=4326),
            nullable=True,
        ),
        sa.Column("lat", sa.Float, nullable=False),
        sa.Column("lng", sa.Float, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_customer_locations_customer_id", "customer_locations", ["customer_id"])

    # GIST spatial indexes for fast ST_Within queries
    op.execute("CREATE INDEX IF NOT EXISTS idx_trip_polygons_pickup_gist ON trip_polygons USING GIST (pickup_polygon);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_trip_polygons_dest_gist ON trip_polygons USING GIST (destination_polygon);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_trip_route_linestring_gist ON trip_route_geometry USING GIST (route_linestring);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_trip_route_buffer_gist ON trip_route_geometry USING GIST (route_buffer);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_customer_locations_location_gist ON customer_locations USING GIST (location);")


def downgrade() -> None:
    op.drop_table("customer_locations")
    op.drop_table("trip_route_geometry")
    op.drop_table("trip_polygons")
