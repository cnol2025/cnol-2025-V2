-- Table pour stocker le programme général/scientifique du CNOL
CREATE TABLE IF NOT EXISTS programme_general (
    id SERIAL PRIMARY KEY,
    titre TEXT NOT NULL DEFAULT 'Programme scientifique',
    contenu TEXT NOT NULL, -- Markdown ou HTML
    publie BOOLEAN NOT NULL DEFAULT FALSE,
    date_publication TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    auteur TEXT
);
-- Index pour retrouver rapidement le programme publié
CREATE INDEX IF NOT EXISTS idx_programme_general_publie ON programme_general(publie); 