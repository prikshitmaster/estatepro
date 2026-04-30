-- Migration: add media_urls array column to properties table
-- Run this once in Supabase SQL Editor

alter table properties
  add column if not exists media_urls text[] default '{}';
