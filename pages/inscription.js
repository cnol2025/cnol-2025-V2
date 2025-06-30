import { useState } from 'react'
import { useRouter } from 'next/router'

export default function Inscription() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    confirmEmail: '',
    telephone: '',
    fonction: '',
    ville: '',
  })
  const [success, setSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    // Vérification des emails
    if (formData.email !== formData.confirmEmail) {
      setErrorMessage("Les adresses e-mail ne correspondent pas.")
      return
    }

    // Vérification des champs obligatoires
    if (!formData.nom || !formData.prenom || !formData.email || !formData.telephone) {
      setErrorMessage("Veuillez remplir tous les champs obligatoires.")
      return
    }

    // Normalisation de l'email
    const email = formData.email.trim().toLowerCase();
    const confirmEmail = formData.confirmEmail.trim().toLowerCase();
    const formDataToSend = { ...formData, email, confirmEmail };

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formDataToSend),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.message || 'Erreur lors de l\'inscription')
      } else {
        setSuccess(true)
      }
    } catch (error) {
      setErrorMessage('Erreur inattendue : ' + error.message)
    }
  }

  if (success) {
    return (
      <div style={successContainerStyle}>
        <h2>✅ Inscription réussie !</h2>
        <p>Votre badge vous sera envoyé par email après validation de l'administrateur.</p>
        <button onClick={() => router.push('/')} style={buttonStyle}>Retour à l'accueil</button>
      </div>
    )
  }

  return (
    <div style={formContainerStyle}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Formulaire d'inscription</h1>
      <form onSubmit={handleSubmit} style={formStyle}>
        <label>Nom *</label>
        <input name="nom" value={formData.nom} onChange={handleChange} required style={inputStyle} />

        <label>Prénom *</label>
        <input name="prenom" value={formData.prenom} onChange={handleChange} required style={inputStyle} />

        <label>Email *</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} required style={inputStyle} />

        <label>Confirmez votre e-mail *</label>
        <input type="email" name="confirmEmail" value={formData.confirmEmail} onChange={handleChange} required style={inputStyle} />

        <label>Téléphone *</label>
        <input type="tel" name="telephone" value={formData.telephone} onChange={handleChange} required style={inputStyle} />

        <label>Fonction</label>
        <select name="fonction" value={formData.fonction} onChange={handleChange} style={inputStyle}>
          <option value="">-- Sélectionnez votre fonction --</option>
          <option value="Opticien">Opticien</option>
          <option value="Ophtalmologue">Ophtalmologue</option>
          <option value="Orthoptiste">Orthoptiste</option>
          <option value="Étudiant">Étudiant</option>
          <option value="Presse">Presse</option>
          <option value="Autre">Autre</option>
        </select>

        <label>Ville</label>
        <input name="ville" value={formData.ville} onChange={handleChange} style={inputStyle} />

        {errorMessage && <p style={{ color: 'red', marginTop: '10px' }}>{errorMessage}</p>}

        <button type="submit" style={buttonStyle}>S'inscrire</button>
      </form>
    </div>
  )
}

const formContainerStyle = {
  maxWidth: '500px',
  margin: '50px auto',
  padding: '30px',
  borderRadius: '8px',
  backgroundColor: '#f8f9fa',
  boxShadow: '0 0 10px rgba(0,0,0,0.1)',
  fontFamily: 'Arial, sans-serif',
}

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
}

const inputStyle = {
  padding: '10px',
  margin: '8px 0 20px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '15px',
}

const buttonStyle = {
  backgroundColor: '#0070f3',
  color: '#fff',
  padding: '12px',
  fontSize: '16px',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  marginTop: '10px',
}

const successContainerStyle = {
  padding: '40px',
  margin: '60px auto',
  maxWidth: '500px',
  borderRadius: '8px',
  backgroundColor: '#d4edda',
  color: '#155724',
  textAlign: 'center',
  fontFamily: 'Arial, sans-serif',
}
