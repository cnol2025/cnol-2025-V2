import React, { useEffect, useState } from 'react'
import { 
  Box, Button, TextField, MenuItem, Select, InputLabel, FormControl, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox,
  CircularProgress, Stack, Pagination, List, ListItem, ListItemText, Divider, Chip
} from '@mui/material'
import toast, { Toaster } from 'react-hot-toast'
import Link from 'next/link'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import ReactMarkdown from 'react-markdown'
import dynamic from 'next/dynamic'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })

const participantTypes = [
  { value: 'exposant', label: 'Exposant' },
  { value: 'intervenant', label: 'Intervenant' },
  { value: 'vip', label: 'VIP' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'opticien', label: 'Opticien' },
  { value: 'ophtalmologue', label: 'Ophtalmologue' },
  { value: 'orthoptiste', label: 'Orthoptiste' },
  { value: 'étudiant', label: 'Étudiant' },
  { value: 'presse', label: 'Presse' },
  { value: 'autre', label: 'Autre' },
]

const sponsoringLevels = [
  { value: 'platinum', label: 'Platinum' },
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
]

const statusFilters = [
  { value: '', label: 'Tous statuts' },
  { value: 'validated', label: 'Validé' },
  { value: 'pending', label: 'Non validé' },
]

const PAGE_SIZE = 10

const AdminPage = () => {
  const router = useRouter()
  const [isAuth, setIsAuth] = useState(false)
  const [inscriptions, setInscriptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('recent')
  const [totalCount, setTotalCount] = useState(0)

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    participant_type: 'opticien',
    sponsoring_level: 'platinum',
    email: '',
    telephone: '',
    ville: '',
    fonction: '',
    organisation: ''
  })
  const [adding, setAdding] = useState(false)
  const [settings, setSettings] = useState({ ouverture_reservation_atelier: false, ouverture_reservation_masterclass: false, programme_published: false })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('admin_auth')
      if (auth === 'true') {
        setIsAuth(true)
      } else {
        router.replace('/admin-login')
      }
    }
  }, [])

  useEffect(() => {
    fetchInscriptions()
  }, [page, search, typeFilter, statusFilter, sortOrder])

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchInscriptions() {
    setLoading(true)
    try {
      let query = supabase
        .from('inscription')
        .select('*', { count: 'exact' })
      // Tri dynamique selon sortOrder
      if (sortOrder === 'recent') {
        query = query.order('created_at', { ascending: false })
      } else if (sortOrder === 'alpha') {
        query = query.order('nom', { ascending: true }).order('prenom', { ascending: true })
      }
      query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      let countQuery = supabase
        .from('inscription')
        .select('id', { count: 'exact', head: true })

      if (search) {
        query = query.or(`nom.ilike.%${search}%,prenom.ilike.%${search}%`)
        countQuery = countQuery.or(`nom.ilike.%${search}%,prenom.ilike.%${search}%`)
      }
      if (statusFilter) {
        query = query.eq('valide', statusFilter === 'validated')
        countQuery = countQuery.eq('valide', statusFilter === 'validated')
      }
      if (typeFilter) {
        query = query.ilike('fonction', typeFilter)
        countQuery = countQuery.ilike('fonction', typeFilter)
      }
      const { data, error, count } = await query.limit(PAGE_SIZE)
      const { count: total, error: countError } = await countQuery
      if (error) {
        toast.error(`Erreur chargement : ${error.message}`)
      } else {
        setInscriptions(data || [])
        setTotalCount(total || 0)
      }
    } catch (error) {
      toast.error('Erreur réseau')
    }
    setLoading(false)
  }

  async function validerInscription(id) {
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `cnol2025-${id}` }),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(result.message)
        fetchInscriptions()
      } else {
        toast.error(`Erreur : ${result.message}`)
      }
    } catch {
      toast.error('Erreur réseau ou serveur')
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    setAdding(true)
    const { nom, prenom, participant_type, sponsoring_level, email, telephone, ville, fonction, organisation } = formData
    if (!nom.trim() || !prenom.trim()) {
      toast.error('Nom et prénom sont obligatoires')
      setAdding(false)
      return
    }
    // Génération d'un code badge unique (3 chiffres + 3 lettres)
    function generateBadgeCode() {
      const digits = Math.floor(100 + Math.random() * 900); // 3 chiffres
      const letters = Array(3)
        .fill(0)
        .map(() => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
        .join('');
      return `${digits}${letters}`;
    }
    // Générer un code badge unique et vérifier unicité
    let badgeCode;
    let isUnique = false;
    while (!isUnique) {
      badgeCode = generateBadgeCode();
      // Vérifier unicité côté client (optionnel, la base doit aussi garantir l'unicité)
      if (!inscriptions.some(i => i.identifiant_badge === badgeCode)) isUnique = true;
    }
    try {
      // 1. Insertion dans inscription
      const { data: inserted, error } = await supabase.from('inscription').insert([
        {
          nom: nom.trim(),
          prenom: prenom.trim(),
          participant_type,
          sponsoring_level: participant_type === 'exposant' ? sponsoring_level : null,
          fonction: fonction.trim() || (participant_type.charAt(0).toUpperCase() + participant_type.slice(1)),
          organisation: participant_type === 'exposant' ? organisation.trim() : null,
          email: email.trim(),
          telephone: telephone.trim(),
          ville: ville.trim(),
          identifiant_badge: badgeCode,
          valide: false,
          scanned: false,
          created_at: new Date().toISOString(),
        },
      ]).select().single();
      if (error) {
        toast.error(`Erreur ajout : ${error.message}`)
      } else {
        // 2. Si exposant, créer l'entrée dans exposants et lier
        if (participant_type === 'exposant') {
          const { data: exp, error: expError } = await supabase.from('exposants').insert([
            {
              nom: organisation.trim(),
              email_responsable: email.trim(),
              created_at: new Date().toISOString(),
            }
          ]).select().single();
          if (!expError && exp && inserted) {
            // 3. Mettre à jour l'inscription avec exposant_id
            await supabase.from('inscription').update({ exposant_id: exp.id }).eq('id', inserted.id);
          }
        }
        toast.success('Inscription ajoutée !')
        setFormData({
          nom: '',
          prenom: '',
          participant_type: 'opticien',
          sponsoring_level: 'platinum',
          email: '',
          telephone: '',
          ville: '',
          fonction: '',
          organisation: ''
        })
        fetchInscriptions()
      }
    } catch (err) {
      toast.error(`Erreur serveur : ${err.message}`)
    }
    setAdding(false)
  }

  function handleChange(e) {
    const { name, value } = e.target
    if (name === 'participant_type') {
      setFormData(prev => ({ ...prev, [name]: value, organisation: '' }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  function handlePrintBadge(inscrit) {
    window.open(`/api/generatedbadge?id=${inscrit.id}`, '_blank')
  }

  const exportCSV = async () => {
    let query = supabase
      .from('inscription')
      .select('*')
      .order('created_at', { ascending: false })
    if (search) {
      query = query.or(`nom.ilike.%${search}%,prenom.ilike.%${search}%`)
    }
    if (statusFilter) {
      query = query.eq('valide', statusFilter === 'validated')
    }
    if (typeFilter) {
      query = query.eq('participant_type', typeFilter)
    }
    const { data, error } = await query
    if (error) {
      toast.error('Erreur export CSV')
      return
    }
    const header = ['Nom','Prénom','Type','Fonction','Statut','Email','Téléphone','Ville']
    const rows = (data || []).map(i => [
      i.nom,
      i.prenom,
      i.participant_type || '',
      i.fonction || '',
      i.valide ? 'Validé' : 'Non validé',
      i.email || '',
      i.telephone || '',
      i.ville || '',
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inscriptions_complet.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').single()
    if (data) setSettings(data)
  }

  const toggleAtelier = async () => {
    await supabase.from('settings').update({ ouverture_reservation_atelier: !settings.ouverture_reservation_atelier }).eq('id', 1)
    fetchSettings()
  }

  const toggleMasterclass = async () => {
    await supabase.from('settings').update({ ouverture_reservation_masterclass: !settings.ouverture_reservation_masterclass }).eq('id', 1)
    fetchSettings()
  }

  if (!isAuth) return null

  function handleLogout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_auth')
      router.replace('/admin-login')
    }
  }

  // TABLEAU/INSCRITS : version mobile = cartes, desktop = tableau
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="outlined" color="error" onClick={handleLogout}>Déconnexion</Button>
      </Box>
      <Toaster position="top-right" />

      <Typography variant="h4" gutterBottom>Administration des Inscriptions</Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Button variant="contained" color="info" href="/scan" fullWidth={isMobile}>
          SCANNER UN BADGE
        </Button>
        <Button variant="contained" color="success" href="/scan-ticket" fullWidth={isMobile}>
          SCANNER UN TICKET
        </Button>
        <Button variant="contained" color="warning" href="/admin/cnol-dor" fullWidth={isMobile}>
          CNOL D'OR
        </Button>
        <Button variant="contained" color="primary" onClick={exportCSV} fullWidth={isMobile}>Exporter CSV</Button>
        <Button variant="outlined" href="/entrees" fullWidth={isMobile}>Voir les entrées</Button>
        <Button variant="outlined" color="secondary" href="/admin/ateliers" fullWidth={isMobile}>Gérer les ateliers</Button>
        <Button variant="outlined" color="secondary" href="/admin/masterclass" fullWidth={isMobile}>Gérer les masterclass</Button>
        <Button variant="outlined" color="info" href="/admin/hotels" fullWidth={isMobile}>Gérer les Hôtels</Button>
        <Button variant="outlined" color="info" href="/admin/statistiques" fullWidth={isMobile}>Statistiques</Button>
        <Button variant="outlined" color="error" href="/admin/notifications" fullWidth={isMobile}>Notifications</Button>
        <Button variant="outlined" color="secondary" href="/admin/intervenants" fullWidth={isMobile}>Gérer les intervenants</Button>
        {settings.programme_published ? (
          <Button variant="contained" color="warning" onClick={async () => {
            await supabase.from('settings').update({ programme_published: false }).eq('id', 1);
            fetchSettings();
            toast.success('Programme dépublié !');
          }} fullWidth={isMobile}>Dépublier le programme</Button>
        ) : (
          <Button variant="contained" color="success" onClick={async () => {
            await supabase.from('settings').update({ programme_published: true }).eq('id', 1);
            fetchSettings();
            toast.success('Programme publié !');
          }} fullWidth={isMobile}>Publier le programme</Button>
        )}
        <Button variant={settings.ouverture_reservation_atelier ? 'contained' : 'outlined'} color="primary" onClick={toggleAtelier} sx={{}} fullWidth={isMobile}>
          {settings.ouverture_reservation_atelier ? 'Fermer les réservations ateliers' : 'Ouvrir les réservations ateliers'}
        </Button>
        <Button variant={settings.ouverture_reservation_masterclass ? 'contained' : 'outlined'} color="secondary" onClick={toggleMasterclass} fullWidth={isMobile}>
          {settings.ouverture_reservation_masterclass ? 'Fermer les réservations masterclass' : 'Ouvrir les réservations masterclass'}
        </Button>
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h5" gutterBottom>Ajouter un participant interne</Typography>
      <form onSubmit={handleAdd}>
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 2 }}>
          <TextField label="Nom" name="nom" value={formData.nom} onChange={handleChange} required fullWidth />
          <TextField label="Prénom" name="prenom" value={formData.prenom} onChange={handleChange} required fullWidth />
          <TextField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} fullWidth />
          <TextField label="Téléphone" name="telephone" value={formData.telephone} onChange={handleChange} fullWidth />
          <TextField label="Ville" name="ville" value={formData.ville} onChange={handleChange} fullWidth />
        </Stack>
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 2 }}>
          <TextField label="Fonction" name="fonction" value={formData.fonction} onChange={handleChange} fullWidth />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" >
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select
              name="participant_type"
              value={formData.participant_type}
              label="Type"
              onChange={handleChange}
            >
              {participantTypes.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {formData.participant_type && formData.participant_type.toLowerCase() === 'exposant' && (
            <TextField
              label="Nom de la société"
              name="organisation"
              value={formData.organisation}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
            />
          )}
          {formData.participant_type === 'exposant' && (
            <FormControl sx={{ minWidth: 180, width: { xs: '100%', sm: 'auto' } }}>
              <InputLabel>Sponsoring</InputLabel>
              <Select label="Sponsoring" name="sponsoring_level" value={formData.sponsoring_level} onChange={handleChange}>
                {sponsoringLevels.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Button type="submit" variant="contained" color="success" disabled={adding} fullWidth={isMobile}>
            {adding ? 'Ajout en cours…' : 'Ajouter'}
          </Button>
        </Stack>
      </form>
      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" sx={{ mb: 2 }}>
        Nombre d'inscrits : {totalCount}
      </Typography>
      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 3 }}>
        <TextField label="Rechercher nom/prénom" variant="outlined" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} fullWidth />
        <FormControl sx={{ minWidth: 160, width: { xs: '100%', sm: 'auto' } }}>
          <InputLabel>Filtrer par type</InputLabel>
          <Select label="Filtrer par type" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
            <MenuItem value="">Tous types</MenuItem>
            {participantTypes.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 160, width: { xs: '100%', sm: 'auto' } }}>
          <InputLabel>Filtrer par statut</InputLabel>
          <Select label="Filtrer par statut" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            {statusFilters.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={sortOrder === 'recent' ? 'contained' : 'outlined'}
            onClick={() => setSortOrder('recent')}
            size="small"
          >
            Dernier inscrit
          </Button>
          <Button
            variant={sortOrder === 'alpha' ? 'contained' : 'outlined'}
            onClick={() => setSortOrder('alpha')}
            size="small"
          >
            Nom A-Z
          </Button>
        </Box>
      </Stack>
      <Divider sx={{ my: 2 }} />
      {/* TABLEAU/INSCRITS : version mobile = cartes, desktop = tableau */}
      {isMobile ? (
        <Stack spacing={2}>
          {loading ? (
            <CircularProgress />
          ) : inscriptions.length === 0 ? (
            <Typography align="center">Aucun inscrit trouvé</Typography>
          ) : (
            inscriptions.map(inscrit => (
              <Paper key={inscrit.id} sx={{ p: 2 }}>
                <Typography><b>Nom :</b> {inscrit.nom}</Typography>
                <Typography><b>Prénom :</b> {inscrit.prenom}</Typography>
                <Typography><b>Type :</b> {inscrit.participant_type || inscrit.fonction}</Typography>
                <Typography><b>Code identification :</b> {inscrit.identifiant_badge || '-'}</Typography>
                <Typography><b>Statut :</b> <span style={{ color: inscrit.valide ? 'green' : 'red' }}>{inscrit.valide ? 'Validé' : 'Non validé'}</span></Typography>
                <Typography><b>Email :</b> {inscrit.email}</Typography>
                <Typography><b>Téléphone :</b> {inscrit.telephone}</Typography>
                <Typography><b>Ville :</b> {inscrit.ville}</Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  {!inscrit.valide && (
                    <Button variant="contained" color="success" size="small" onClick={() => validerInscription(inscrit.id)}>
                      Valider
                    </Button>
                  )}
                  <Button variant="contained" color="primary" size="small" onClick={() => handlePrintBadge(inscrit)}>
                    Imprimer
                  </Button>
                </Box>
              </Paper>
            ))
          )}
        </Stack>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Prénom</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Code identification</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell>Ville</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : inscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Aucun inscrit trouvé
                  </TableCell>
                </TableRow>
              ) : (
                inscriptions.map(inscrit => (
                  <TableRow key={inscrit.id}>
                    <TableCell>{inscrit.nom}</TableCell>
                    <TableCell>{inscrit.prenom}</TableCell>
                    <TableCell>{inscrit.participant_type || inscrit.fonction}</TableCell>
                    <TableCell>{inscrit.identifiant_badge || '-'}</TableCell>
                    <TableCell sx={{ color: inscrit.valide ? 'green' : 'red' }}>{inscrit.valide ? 'Validé' : 'Non validé'}</TableCell>
                    <TableCell>{inscrit.email}</TableCell>
                    <TableCell>{inscrit.telephone}</TableCell>
                    <TableCell>{inscrit.ville}</TableCell>
                    <TableCell>
                      {!inscrit.valide && (
                        <Button variant="contained" color="success" size="small" onClick={() => validerInscription(inscrit.id)}>
                          Valider
                        </Button>
                      )}
                      <Button variant="contained" color="primary" size="small" onClick={() => handlePrintBadge(inscrit)} sx={{ ml: 1 }}>
                        Imprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination
          count={10} // ajuster si tu connais le total
          page={page}
          onChange={(_, value) => setPage(value)}
          color="primary"
          showFirstButton
          showLastButton
          size={isMobile ? 'large' : 'medium'}
        />
      </Box>
    </Box>
  )
}

export default AdminPage
// Correction V2: commit technique pour forcer build Vercel
