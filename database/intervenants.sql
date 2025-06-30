-- Table des intervenants
CREATE TABLE IF NOT EXISTS intervenants (
    id SERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    photo_url TEXT, -- URL Supabase Storage
    biographie TEXT, -- Markdown ou HTML
    fonction TEXT,
    organisation TEXT,
    reseaux_sociaux JSONB, -- optionnel, pour stocker les liens sociaux
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des interventions (liens intervenant <-> événement)
CREATE TABLE IF NOT EXISTS interventions (
    id SERIAL PRIMARY KEY,
    intervenant_id INTEGER NOT NULL REFERENCES intervenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('conference', 'atelier', 'masterclass')),
    titre TEXT NOT NULL,
    horaire TIMESTAMP WITH TIME ZONE,
    salle TEXT,
    programme_id INTEGER, -- optionnel, pour lier à une entrée du programme général/atelier/masterclass
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interventions_intervenant ON interventions(intervenant_id);
CREATE INDEX IF NOT EXISTS idx_interventions_type ON interventions(type); 