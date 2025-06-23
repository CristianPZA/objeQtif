/*
  # Add date_naissance column to user_profiles

  1. New Column
    - `date_naissance` (date) - Date de naissance de l'employé pour générer le mot de passe

  2. Notes
    - Cette colonne sera utilisée pour générer automatiquement le mot de passe (format jjmmaaaa)
    - Le champ est obligatoire pour la création d'un nouvel employé
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'date_naissance'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN date_naissance DATE;
  END IF;
END $$;