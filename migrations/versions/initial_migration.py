"""initial migration

Revision ID: initial_migration
Revises: 
Create Date: 2024-11-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

# revision identifiers, used by Alembic.
revision = 'initial_migration'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create User table
    op.create_table('user',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('google_id', sa.String(length=100), nullable=True),
        sa.Column('email', sa.String(length=100), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('google_id')
    )

    # Create Polygon table with all fields including user_id
    op.create_table('polygon',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('coordinates', sa.JSON(), nullable=False),
        sa.Column('height', sa.Float(), nullable=False),
        sa.Column('fill_color', sa.String(length=50), nullable=False),
        sa.Column('fill_opacity', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('stroke_color', sa.String(length=50), nullable=False),
        sa.Column('stroke_opacity', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('stroke_width', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('polygon')
    op.drop_table('user')
