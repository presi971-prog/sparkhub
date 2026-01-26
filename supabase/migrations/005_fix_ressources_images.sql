-- Mise à jour des URLs d'images des ressources (PNG -> SVG)
UPDATE ressources SET image_url = '/images/ressources/cm-ia.svg' WHERE image_url = '/images/ressources/cm-ia.png';
UPDATE ressources SET image_url = '/images/ressources/visuels.svg' WHERE image_url = '/images/ressources/visuels.png';
UPDATE ressources SET image_url = '/images/ressources/video.svg' WHERE image_url = '/images/ressources/video.png';
UPDATE ressources SET image_url = '/images/ressources/compta.svg' WHERE image_url = '/images/ressources/compta.png';
UPDATE ressources SET image_url = '/images/ressources/blog.svg' WHERE image_url = '/images/ressources/blog.png';
UPDATE ressources SET image_url = '/images/ressources/guide.svg' WHERE image_url = '/images/ressources/guide.png';
