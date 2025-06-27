-- Migration : Ajout des colonnes emails, telephones et adresses à la table exposants
ALTER TABLE exposants ADD COLUMN IF NOT EXISTS emails JSONB DEFAULT '[]';
ALTER TABLE exposants ADD COLUMN IF NOT EXISTS telephones JSONB DEFAULT '[]';
ALTER TABLE exposants ADD COLUMN IF NOT EXISTS adresses JSONB DEFAULT '[]'; 