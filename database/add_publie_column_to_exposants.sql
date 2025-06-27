-- Migration : Ajout de la colonne publie à la table exposants
ALTER TABLE exposants ADD COLUMN IF NOT EXISTS publie BOOLEAN DEFAULT FALSE; 