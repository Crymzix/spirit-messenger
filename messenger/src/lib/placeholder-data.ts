// Placeholder data for development and visualization
import { Contact, ContactGroup } from '@/types';

// Placeholder contacts with various presence statuses
export const placeholderContacts: Contact[] = [
  // Online contacts
  {
    id: "contact-1",
    userId: "current-user-id",
    status: "accepted",
    createdAt: new Date("2024-01-15"),
    contactUser: {
      id: "user-1",
      email: "sarah.johnson@example.com",
      username: "sarah_j",
      displayName: "Sarah Johnson",
      personalMessage: "Coffee enthusiast ☕",
      displayPictureUrl: "https://i.pravatar.cc/150?img=1",
      presenceStatus: "online",
      lastSeen: new Date(),
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date()
    }
  },
  {
    id: "contact-2",
    userId: "current-user-id",
    status: "accepted",
    createdAt: new Date("2024-01-20"),
    contactUser: {
      id: "user-2",
      email: "mike.chen@example.com",
      username: "mike_c",
      displayName: "Mike Chen",
      personalMessage: "Coding at 3 AM 💻",
      displayPictureUrl: "https://i.pravatar.cc/150?img=12",
      presenceStatus: "online",
      lastSeen: new Date(),
      createdAt: new Date("2024-01-05"),
      updatedAt: new Date()
    }
  },
  {
    id: "contact-3",
    userId: "current-user-id",
    status: "accepted",
    createdAt: new Date("2024-02-01"),
    contactUser: {
      id: "user-3",
      email: "emma.davis@example.com",
      username: "emma_d",
      displayName: "Emma Davis",
      personalMessage: "Living my best life! 🌟",
      displayPictureUrl: "https://i.pravatar.cc/150?img=5",
      presenceStatus: "away",
      lastSeen: new Date(Date.now() - 300000), // 5 minutes ago
      createdAt: new Date("2024-01-10"),
      updatedAt: new Date()
    }
  },
  {
    id: "contact-4",
    userId: "current-user-id",
    status: "accepted",
    createdAt: new Date("2024-02-05"),
    contactUser: {
      id: "user-4",
      email: "james.wilson@example.com",
      username: "james_w",
      displayName: "James Wilson",
      personalMessage: "In a meeting, DND",
      displayPictureUrl: "https://i.pravatar.cc/150?img=13",
      presenceStatus: "busy",
      lastSeen: new Date(),
      createdAt: new Date("2024-01-12"),
      updatedAt: new Date()
    }
  },
  {
    id: "contact-5",
    userId: "current-user-id",
    status: "accepted",
    createdAt: new Date("2024-02-10"),
    contactUser: {
      id: "user-5",
      email: "olivia.brown@example.com",
      username: "olivia_b",
      displayName: "Olivia Brown",
      personalMessage: "Design is my passion 🎨",
      displayPictureUrl: "https://i.pravatar.cc/150?img=9",
      presenceStatus: "online",
      lastSeen: new Date(),
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date()
    }
  },

  // Offline contacts
  {
    id: "contact-6",
    userId: "current-user-id",
    status: "accepted",
    createdAt: new Date("2024-02-15"),
    contactUser: {
      id: "user-6",
      email: "alex.taylor@example.com",
      username: "alex_t",
      displayName: "Alex Taylor",
      personalMessage: "Gamer 4 life 🎮",
      displayPictureUrl: "https://i.pravatar.cc/150?img=14",
      presenceStatus: "offline",
      lastSeen: new Date(Date.now() - 3600000), // 1 hour ago
      createdAt: new Date("2024-01-18"),
      updatedAt: new Date()
    }
  },
  {
    id: "contact-7",
    userId: "current-user-id",
    status: "accepted",
    createdAt: new Date("2024-02-20"),
    contactUser: {
      id: "user-7",
      email: "sophia.martinez@example.com",
      username: "sophia_m",
      displayName: "Sophia Martinez",
      personalMessage: "Wanderlust ✈️",
      displayPictureUrl: "https://i.pravatar.cc/150?img=10",
      presenceStatus: "offline",
      lastSeen: new Date(Date.now() - 86400000), // 1 day ago
      createdAt: new Date("2024-01-20"),
      updatedAt: new Date()
    }
  },
  {
    id: "contact-8",
    userId: "current-user-id",
    status: "accepted",
    createdAt: new Date("2024-02-25"),
    contactUser: {
      id: "user-8",
      email: "daniel.lee@example.com",
      username: "daniel_l",
      displayName: "Daniel Lee",
      personalMessage: "Fitness junkie 💪",
      displayPictureUrl: "https://i.pravatar.cc/150?img=15",
      presenceStatus: "appear_offline",
      lastSeen: new Date(Date.now() - 7200000), // 2 hours ago
      createdAt: new Date("2024-01-22"),
      updatedAt: new Date()
    }
  },
  {
    id: "contact-9",
    userId: "current-user-id",
    status: "accepted",
    createdAt: new Date("2024-03-01"),
    contactUser: {
      id: "user-9",
      email: "rachel.kim@example.com",
      username: "rachel_k",
      displayName: "Rachel Kim",
      personalMessage: "Foodie adventures 🍜",
      displayPictureUrl: "https://i.pravatar.cc/150?img=16",
      presenceStatus: "offline",
      lastSeen: new Date(Date.now() - 172800000), // 2 days ago
      createdAt: new Date("2024-01-25"),
      updatedAt: new Date()
    }
  },
  {
    id: "contact-10",
    userId: "current-user-id",
    status: "accepted",
    createdAt: new Date("2024-03-05"),
    contactUser: {
      id: "user-10",
      email: "chris.anderson@example.com",
      username: "chris_a",
      displayName: "Chris Anderson",
      personalMessage: "Music producer 🎵",
      displayPictureUrl: "https://i.pravatar.cc/150?img=17",
      presenceStatus: "offline",
      lastSeen: new Date(Date.now() - 259200000), // 3 days ago
      createdAt: new Date("2024-01-28"),
      updatedAt: new Date()
    }
  },

  // Blocked contact
  {
    id: "contact-11",
    userId: "current-user-id",
    status: "blocked",
    createdAt: new Date("2024-03-10"),
    contactUser: {
      id: "user-11",
      email: "blocked.user@example.com",
      username: "blocked_user",
      displayName: "Blocked User",
      personalMessage: "",
      displayPictureUrl: "https://i.pravatar.cc/150?img=18",
      presenceStatus: "offline",
      lastSeen: new Date(Date.now() - 604800000), // 1 week ago
      createdAt: new Date("2024-02-01"),
      updatedAt: new Date()
    }
  }
];

// Placeholder custom contact groups
export const placeholderContactGroups: ContactGroup[] = [
  {
    id: "group-1",
    userId: "current-user-id",
    name: "Work",
    displayOrder: 0,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date()
  },
  {
    id: "group-2",
    userId: "current-user-id",
    name: "College Friends",
    displayOrder: 1,
    createdAt: new Date("2024-01-16"),
    updatedAt: new Date()
  },
  {
    id: "group-3",
    userId: "current-user-id",
    name: "Family",
    displayOrder: 2,
    createdAt: new Date("2024-01-17"),
    updatedAt: new Date()
  }
];

// Placeholder pending contact requests (for ContactRequestNotification)
export const placeholderPendingRequests: Contact[] = [
  {
    id: "pending-1",
    userId: "user-20",
    status: "pending",
    createdAt: new Date(Date.now() - 3600000), // 1 hour ago
    contactUser: {
      id: "user-20",
      email: "lisa.walker@example.com",
      username: "lisa_w",
      displayName: "Lisa Walker",
      personalMessage: "New to the platform!",
      displayPictureUrl: "https://i.pravatar.cc/150?img=20",
      presenceStatus: "online",
      lastSeen: new Date(),
      createdAt: new Date("2024-03-15"),
      updatedAt: new Date()
    }
  },
  {
    id: "pending-2",
    userId: "user-21",
    status: "pending",
    createdAt: new Date(Date.now() - 7200000), // 2 hours ago
    contactUser: {
      id: "user-21",
      email: "tom.hughes@example.com",
      username: "tom_h",
      displayName: "Tom Hughes",
      personalMessage: "Let's connect!",
      displayPictureUrl: "https://i.pravatar.cc/150?img=21",
      presenceStatus: "away",
      lastSeen: new Date(Date.now() - 600000),
      createdAt: new Date("2024-03-14"),
      updatedAt: new Date()
    }
  }
];
