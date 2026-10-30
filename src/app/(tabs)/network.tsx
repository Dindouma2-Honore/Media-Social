import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ConnectionActions } from '@/components/ConnectionActions';
import { EmptyState } from '@/components/EmptyState';
import { UserRow } from '@/components/UserRow';
import { useAuth } from '@/lib/auth';
import { useNetwork } from '@/lib/network';
import { supabase } from '@/lib/supabase';
import { PublicProfile } from '@/lib/types';
import { AppColors, radius } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

type Tab = 'discover' | 'invitations' | 'contacts';

export default function NetworkScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { session } = useAuth();
  const { received, refresh } = useNetwork();
  const [tab, setTab] = useState<Tab>('discover');

  // Recharge les invitations chaque fois qu'on revient sur cet onglet.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const openProfile = (id: string) => router.push(`/user/${id}`);

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'discover', label: 'Découvrir' },
    { key: 'invitations', label: 'Invitations', badge: received.length },
    { key: 'contacts', label: 'Contacts' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)}>
            <View style={styles.tabLabelRow}>
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
              {t.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t.badge}</Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.tabUnderline, tab === t.key && styles.tabUnderlineActive]} />
          </Pressable>
        ))}
      </View>

      {tab === 'discover' && session ? (
        <DiscoverList meId={session.user.id} onOpen={openProfile} />
      ) : null}
      {tab === 'invitations' ? <InvitationsList onOpen={openProfile} /> : null}
      {tab === 'contacts' ? <ContactsList onOpen={openProfile} /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Onglet "Découvrir" : recherche de personnes
// ---------------------------------------------------------------------------
function DiscoverList({ meId, onOpen }: { meId: string; onOpen: (id: string) => void }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  // "Debounce" : on attend 300 ms après la dernière frappe avant de lancer la recherche.
  useEffect(() => {
    const current = ++requestId.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      // On retire les caractères qui ont un sens spécial dans le filtre.
      const term = query.trim().replace(/[%,()*]/g, '');

      let request = supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .neq('id', meId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (term) {
        request = request.or(`username.ilike.%${term}%,full_name.ilike.%${term}%`);
      }

      const { data } = await request;

      // On ignore la réponse si une recherche plus récente a été lancée entre-temps.
      if (current === requestId.current) {
        setResults((data as unknown as PublicProfile[] | null) ?? []);
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, meId]);

  return (
    <View style={styles.flex}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom ou pseudo"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {loading && results.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <UserRow profile={item} onPress={() => onOpen(item.id)}>
              <ConnectionActions userId={item.id} />
            </UserRow>
          )}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>{query.trim() ? 'Résultats' : 'Suggestions'}</Text>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>Aucune personne trouvée.</Text>}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Onglet "Invitations" : reçues + envoyées
// ---------------------------------------------------------------------------
function InvitationsList({ onOpen }: { onOpen: (id: string) => void }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { received, sent, refresh } = useNetwork();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <SectionList
      sections={[
        { title: 'Invitations reçues', data: received },
        { title: 'Invitations envoyées', data: sent },
      ]}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionTitle}>
          {section.title} ({section.data.length})
        </Text>
      )}
      renderSectionFooter={({ section }) =>
        section.data.length === 0 ? <Text style={styles.emptyText}>Aucune invitation.</Text> : null
      }
      renderItem={({ item }) => (
        <UserRow profile={item.other} onPress={() => onOpen(item.other.id)}>
          <ConnectionActions userId={item.other.id} />
        </UserRow>
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.listContent}
    />
  );
}

// ---------------------------------------------------------------------------
// Onglet "Contacts" : relations acceptées
// ---------------------------------------------------------------------------
function ContactsList({ onOpen }: { onOpen: (id: string) => void }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { contacts, refresh } = useNetwork();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <FlatList
      data={contacts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <UserRow profile={item.other} onPress={() => onOpen(item.other.id)}>
          <ConnectionActions userId={item.other.id} />
        </UserRow>
      )}
      ListEmptyComponent={
        <EmptyState
          icon="people-outline"
          title="Pas encore de contacts"
          text="Invite des personnes depuis l'onglet Découvrir. Elles apparaîtront ici dès qu'elles acceptent."
        />
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      contentContainerStyle={contacts.length === 0 ? styles.emptyContent : styles.listContent}
    />
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 14,
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabUnderline: {
    height: 3,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: {
    backgroundColor: colors.accent, // soulignement jaune
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    marginLeft: 6,
    backgroundColor: colors.danger, // pastille rouge
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: colors.text,
  },
  loader: {
    marginTop: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    marginHorizontal: 16,
    marginTop: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginHorizontal: 16,
    marginTop: 10,
    fontStyle: 'italic',
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyContent: {
    flexGrow: 1,
  },
  });
}
