export const BRAND = {
  name: 'AGM HOTEL',
  tagline: 'Engineering Hunger, Serving Solutions',
  instagram: '@agmhotel_canteen'
}

export const ORDER_STATUSES = ['placed', 'preparing', 'ready', 'served', 'rejected', 'cancelled']

export const PAYMENT_REMINDERS = [
  'Trust is good, cash is better. Pay at counter.',
  'No free lunch in engineering. Pay at counter.',
  'while(hungry){ eat(); } payAtCounter();',
  'Compile your payment at counter.',
  'Do not be a bug, pay at counter.'
]

export const QUICK_RATING_TAGS = ['Tasty', 'Quick', 'Worth it', 'Too spicy', 'Cold']

function item(categoryId, category, id, name, price, tagline, imageName, flags = []) {
  return { id, categoryId, category, name, price, tagline, imageName, flags, veg: true, available: true }
}

export const FALLBACK_MENU_ITEMS = [
  item('breakfast', 'Breakfast', 'uppit', 'Uppit (Upma)', 20, 'Morning algorithm starter', 'uppit.jpg', ['Quick (5 mins)']),
  item('breakfast', 'Breakfast', 'avalakki', 'Avalakki (Poha)', 30, 'Lightweight breakfast, heavy performance', 'poha.jpg'),
  item('breakfast', 'Breakfast', 'puri', 'Puri', 45, 'Fluffy circles of happiness', 'puri.jpg'),
  item('breakfast', 'Breakfast', 'puri-single', 'Puri (Single)', 35, 'Single plate option', 'puri.jpg'),
  item('breakfast', 'Breakfast', 'idli-wada', 'Idli Wada', 40, 'Soft idli with crisp wada', 'idli-wada.jpg'),
  item('breakfast', 'Breakfast', 'masala-dosa', 'Masala Dosa', 50, 'South India crispy legacy', 'masala-dosa.jpg', ['Bestseller']),
  item('breakfast', 'Breakfast', 'plain-dosa', 'Plain Dosa', 40, 'Simple, classic, perfect', 'plain-dosa.jpg'),
  item('breakfast', 'Breakfast', 'uttappa', 'Uttappa', 60, 'Thick and fluffy comfort', 'uttappa.jpg'),
  item('breakfast', 'Breakfast', 'set-dosa', 'Set Dosa', 60, 'Triple the joy', 'set-dosa.jpg', ['Today Special']),
  item('breakfast', 'Breakfast', 'palau', 'Palau (Pulao)', 40, 'One-pot wonder', 'pulao.jpg'),
  item('breakfast', 'Breakfast', 'kushka', 'Kushka', 60, 'Hyderabadi soul food', 'kushka.avif'),
  item('lunch', 'Lunch', 'chapati-uta', 'Chapati Uta (Set)', 80, 'Homestyle thali vibes', 'chapati-uta.jpg', ['Bestseller']),
  item('lunch', 'Lunch', 'puri-uta', 'Puri Uta (Set)', 80, 'Festival on a plate', 'puri-uta.jpg'),
  item('lunch', 'Lunch', 'menthe-chapatpi-uta', 'Menthe Chapatpi Uta', 100, 'Fenugreek fresh feast', 'menthe-chapati-uta.png'),
  item('rice', 'Rice Items', 'jeera-rice', 'Jeera Rice', 70, 'Cumin-kissed comfort', 'jeera-rice.jpg'),
  item('rice', 'Rice Items', 'veg-fried-rice', 'Veg Fried Rice', 70, 'Wok-tossed happiness', 'veg-fried-rice.jpg'),
  item('rice', 'Rice Items', 'ghee-rice', 'Ghee Rice', 90, 'Golden richness in every grain', 'ghee-rice.jpg', ['Today Special']),
  item('rice', 'Rice Items', 'lemon-rice', 'Lemon Rice', 70, 'Tangy South Indian classic', 'lemon-rice.jpg'),
  item('rice', 'Rice Items', 'masala-rice', 'Masala Rice', 70, 'Spice-infused comfort', 'masala-rice.jpg'),
  item('rice', 'Rice Items', 'puliyogare', 'Puliyogare (Tamarind Rice)', 70, 'Temple prasad at your table', 'puliyogare.jpg'),
  item('rice', 'Rice Items', 'gobi-rice', 'Gobi Rice', 90, 'Cauliflower power bowl', 'gobi-rice.png'),
  item('snacks', 'Snacks', 'gobi-dry', 'Gobi (Manchurian/Dry)', 70, 'Crispy cauliflower bites', 'gobi-dry.jpg', ['Bestseller']),
  item('snacks', 'Snacks', 'french-fries', 'French Fries', 60, 'Potato sticks of joy', 'french-fries.jpg', ['Quick (5 mins)']),
  item('snacks', 'Snacks', 'sabudana-vada', 'Sabudana Vada', 40, 'Fast-friendly crunch', 'sabudana-vada.jpg'),
  item('snacks', 'Snacks', 'vada-pav', 'Vada Pav', 20, 'Mumbai heartbeat', 'vada-pav.jpg', ['Bestseller', 'Quick (5 mins)']),
  item('snacks', 'Snacks', 'maskabun', 'Maskabun (Butter Bun)', 20, 'College nostalgia', 'muska-bun.jpg'),
  item('snacks', 'Snacks', 'chocolate', 'Chocolate', 30, 'Sweet mood fixer', 'choclate-bun.jpg', ['Quick (5 mins)']),
  item('snacks', 'Snacks', 'nuggets', 'Nuggets', 45, 'Bite-sized happiness', 'nuggets.jpg'),
  item('snacks', 'Snacks', 'corn-stick', 'Corn Stick', 45, 'Crunchy corn delight', 'sticks.jpg'),
  item('beverages', 'Beverages', 'tea', 'Tea', 10, 'Hostel survival fuel', 'tea.jpg', ['Quick (5 mins)']),
  item('beverages', 'Beverages', 'coffee', 'Coffee', 15, 'Debug your drowsiness', 'coffee.jpg', ['Bestseller', 'Quick (5 mins)']),
  item('beverages', 'Beverages', 'bournvita', 'Bournvita', 15, 'Childhood in a cup', 'bournvita.png'),
  item('beverages', 'Beverages', 'boost', 'Boost', 15, 'Energy for engineers', 'boost.png'),
  item('beverages', 'Beverages', 'milk', 'Milk', 20, 'Pure calcium power', 'milk.jpg'),
  item('milkshakes', 'Milkshakes', 'strawberry-shake', 'Strawberry', 60, 'Berry blast refresh', 'strawberry-shake.jpg'),
  item('milkshakes', 'Milkshakes', 'banana-shake', 'Banana Shake', 60, 'Potassium power-up', 'banana-shake.jpg'),
  item('milkshakes', 'Milkshakes', 'cold-coffee', 'Cold Coffee', 60, 'Caffeine cooler', 'cold-coffee.jpg', ['Bestseller']),
  item('milkshakes', 'Milkshakes', 'oreo-shake', 'Oreo', 60, 'Cookie chaos in a glass', 'oreo-shake.jpg'),
  item('milkshakes', 'Milkshakes', 'kitkat-shake', 'KitKat', 60, 'Break time essential', 'kitkat-shake.jpg'),
  item('juices', 'Juices', 'watermelon-juice', 'Watermelon', 50, 'Summer hydration hero', 'watermelon-juice.jpg'),
  item('juices', 'Juices', 'pineapple-juice', 'Pineapple', 50, 'Tropical tang', 'pineapple-juice.jpg'),
  item('juices', 'Juices', 'chickoo-juice', 'Chickoo', 50, 'Sapota sweetness', 'chickoo-juice.jpg'),
  item('juices', 'Juices', 'orange-juice', 'Orange', 50, 'Vitamin C boost', 'orange-juice.jpg'),
  item('juices', 'Juices', 'apple-juice', 'Apple', 50, 'Keep doctor away', 'apple-juice.jpg'),
  item('juices', 'Juices', 'karbuj-juice', 'Karbuj (Musk Melon)', 50, 'Melon madness', 'karbuj-juice.jpg'),
  item('juices', 'Juices', 'papaya-juice', 'Papaya', 50, 'Digestive delight', 'papaya-juice.jpg'),
  item('extras', 'Extras', 'fruit-salad', 'Fruit Salad', 40, 'Freshness bowl', 'fruit-salad.jpg')
]
