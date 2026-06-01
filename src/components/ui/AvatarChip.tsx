import { useApp } from '../../context/AppContext';

interface Props {
  personId: string;
}

export default function AvatarChip({ personId }: Props) {
  const { store } = useApp();
  const person = store.people.find((p) => p.id === personId);
  if (!person) return null;

  const initials = person.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');

  return (
    <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2.5 py-1">
      {person.photoUrl ? (
        <img
          src={person.photoUrl}
          alt={person.name}
          className="w-5 h-5 rounded-full object-cover"
        />
      ) : (
        <div className="w-5 h-5 rounded-full bg-cactus-accent flex items-center justify-center text-white text-xs font-semibold"
          style={{ backgroundColor: store.firm.accentColor }}>
          {initials}
        </div>
      )}
      <span className="text-xs text-gray-700 font-medium">{person.name}</span>
    </div>
  );
}
