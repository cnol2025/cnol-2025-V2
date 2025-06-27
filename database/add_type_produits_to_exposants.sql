-- Migration : Ajout de la colonne type_produits à la table exposants
ALTER TABLE exposants ADD COLUMN IF NOT EXISTS type_produits TEXT; 