import { createClient } from '@supabase/supabase-js';

// Création d'un client Supabase avec la clé de service pour avoir les droits admin
// et contourner les Row Level Security (RLS).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  // DEBUG: log du body reçu
  console.log("[push/subscribe] Body reçu:", req.body);

  // Accepter soit un objet subscription, soit des champs séparés
  const { subscription, userId } = req.body;
  const sub = subscription || req.body;
  
  if (!userId || !sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return res.status(400).json({ 
      message: "Paramètres manquants: userId et subscription (endpoint, keys.p256dh, keys.auth) sont requis" 
    });
  }

  try {
    // Vérifier si l'abonnement existe déjà pour cet utilisateur
    const { data: existing } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("endpoint", sub.endpoint)
      .single();

    const subscriptionData = {
  p256dh: sub.keys.p256dh,
  auth: sub.keys.auth,
  // updated_at supprimé car la colonne n'existe plus
};
    if (existing) {
      // Mettre à jour l'abonnement existant
      const { error: updateError } = await supabaseAdmin
        .from("push_subscriptions")
        .update(subscriptionData)
        .eq("id", existing.id);

      if (updateError) {
        console.error("Erreur mise à jour abonnement:", updateError);
        return res.status(500).json({ message: "Erreur lors de la mise à jour de l'abonnement" });
      }

      return res.status(200).json({ 
        message: "Abonnement push mis à jour avec succès",
        type: "updated"
      });
    } else {
      // Créer un nouvel abonnement
      const { error: insertError } = await supabaseAdmin
        .from("push_subscriptions")
        .insert({
          user_id: userId,
          endpoint: sub.endpoint,
          ...subscriptionData,
        });

      if (insertError) {
        console.error("Erreur création abonnement:", insertError);
        return res.status(500).json({ message: "Erreur lors de la création de l'abonnement" });
      }

      return res.status(201).json({ 
        message: "Abonnement push créé avec succès",
        type: "created"
      });
    }
  } catch (error) {
    console.error("Erreur API push subscribe:", error);
    return res.status(500).json({ message: "Erreur serveur interne" });
  }
}
