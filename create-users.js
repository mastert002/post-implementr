const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Usage: node create-users.js "<password>"');
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log('Password Hash:', hash);
  console.log('\n--- SQL to Execute ---\n');

  const sql = `INSERT INTO users (email, password_hash) VALUES
('mumeenat.olabamiji@africaprudential.com', '${hash}'),
('temitope.odemo@africaprudential.com', '${hash}'),
('samuel.durumba@africaprudential.com', '${hash}');`;

  console.log(sql);
  console.log('\n--- End SQL ---\n');
});
