// NS88 Discord Bot - Rekber/MC System
// Pastikan Discord.js v14+ terinstall: npm install discord.js@latest

const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder
} = require('discord.js');

// SETTING: ID Channel untuk auto-setup (GANTI DENGAN ID CHANNEL ANDA!)
const SETUP_CHANNEL_ID = process.env.SETUP_CHANNEL_ID;

// SETTING: ID Channel untuk arsip ticket (GANTI DENGAN ID CHANNEL ANDA!)
const ARCHIVE_CHANNEL_ID = process.env.ARCHIVE_CHANNEL_ID;

// SETTING: Username untuk notifikasi admin (GANTI SESUAI KEBUTUHAN!)
const ADMIN_USERNAME = 'crzdrn'; // atau 'Croz' sesuai username yang digunakan

// SETTING: Channel IDs untuk auto-warning rekber/mc (GANTI DENGAN ID CHANNEL ANDA!)
const WARNING_CHANNEL_IDS = [
  '1458354271136383026', // Channel Market - GANTI dengan ID channel Anda
  // Tambahkan channel lain sesuai kebutuhan
];

// SETTING: ID Channel ticket-rekber untuk mention di warning (GANTI DENGAN ID CHANNEL ANDA!)
const TICKET_REKBER_CHANNEL_ID = process.env.TICKET_CHANNEL; // Ganti dengan ID channel ticket-rekber Anda

// SETTING: Nama role donatur (GANTI SESUAI ROLE DI SERVER ANDA!)
const DONATUR_ROLE_NAME = 'Donatur NS88'; // Nama role donatur di server Anda

// SETTING: Slowmode duration (dalam detik)
const SLOWMODE_DONATUR = 30; // Donatur: 30 detik
const SLOWMODE_NON_DONATUR = 180; // Non-donatur: 3 menit (180 detik)

// Menyimpan ID pesan warning terakhir per channel
const lastWarningMessages = new Map();

// Menyimpan waktu terakhir user mengirim pesan per channel
const userLastMessageTime = new Map();

// Inisialisasi client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, // PENTING: untuk fetch members
  ]
});

// Database sederhana (gunakan database real untuk production)
const tickets = new Map();
let ticketCounter = 1;

// Fungsi hitung fee
function calculateFee(nominal) {
  const amount = parseInt(nominal);
  if (amount >= 1000 && amount <= 9000) return 2000;
  if (amount >= 10000 && amount <= 49000) return 3000;
  if (amount >= 50000 && amount <= 99000) return 4000;
  if (amount >= 100000 && amount <= 150000) return 7000;
  if (amount >= 150000 && amount <= 300000) return 10000;
  if (amount > 300000) return Math.floor(amount * 0.05);
  return 0;
}

// Fungsi untuk mengirim ke arsip dan hapus channel
async function archiveAndDeleteTicket(ticket, status, guild) {
  try {
    // Kirim ke channel arsip
    if (ARCHIVE_CHANNEL_ID) {
      const archiveChannel = await guild.channels.fetch(ARCHIVE_CHANNEL_ID);
      
      if (archiveChannel) {
        const statusColor = status === 'selesai' ? '#00FF00' : '#FF0000';
        const statusEmoji = status === 'selesai' ? '✅' : '❌';
        const statusText = status === 'selesai' ? 'SELESAI' : 'DIBATALKAN';
        
        const archiveEmbed = new EmbedBuilder()
          .setColor(statusColor)
          .setTitle(`${statusEmoji} ARSIP TICKET - ${statusText}`)
          .setDescription(
            `**${ticket.id}**\n\n` +
            `**Detail Transaksi:**\n` +
            `🛒 **Barang:** ${ticket.item}\n\n` +
            `👤 **Pembeli:** ${ticket.buyer}\n` +
            `💼 **Penjual:** ${ticket.seller}\n\n` +
            `💰 **Nominal:** ${formatRupiah(ticket.nominal)}\n` +
            `💵 **Fee Jasa MC:** ${formatRupiah(ticket.fee)}\n` +
            `💳 **Total Pembayaran:** ${formatRupiah(ticket.total)}\n\n` +
            `💳 **Metode Pembayaran:** ${ticket.paymentMethod}\n` +
            `📅 **Dibuat:** ${ticket.createdAt.toLocaleString('id-ID')}\n` +
            `🏁 **Status:** ${statusText}`
          )
          .setFooter({ text: 'NS88 BOT 🤖 - Arsip Ticket' })
          .setTimestamp();
        
        await archiveChannel.send({ embeds: [archiveEmbed] });
        console.log(`📁 Ticket ${ticket.id} diarsipkan`);
      }
    }
    
    // Hapus channel ticket setelah 5 detik
    const ticketChannel = await guild.channels.fetch(ticket.channelId);
    if (ticketChannel) {
      await ticketChannel.send(`⏳ Channel ini akan dihapus dalam 5 detik...`);
      
      setTimeout(async () => {
        try {
          await ticketChannel.delete();
          console.log(`🗑️ Channel ${ticketChannel.name} berhasil dihapus`);
        } catch (error) {
          console.error('❌ Error menghapus channel:', error);
        }
      }, 5000); // 5 detik
    }
  } catch (error) {
    console.error('❌ Error dalam archiveAndDeleteTicket:', error);
  }
}

// Format rupiah
function formatRupiah(amount) {
  return `Rp ${parseInt(amount).toLocaleString('id-ID')}`;
}

// Event: Bot ready
client.once('clientReady', async (client) => {
  console.log(`✅ Bot ${client.user.tag} sudah online!`);
  console.log(`📊 Terhubung ke ${client.guilds.cache.size} server(s)`);
  client.user.setActivity('Rekber/MC System', { type: 3 }); // 3 = WATCHING
  
  // Auto-setup saat bot online
  if (SETUP_CHANNEL_ID) {
    try {
      const channel = await client.channels.fetch(SETUP_CHANNEL_ID);
      
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('Welcome To Ticket Section')
          .setDescription('Silakan pilih dibawah sesuai kebutuhanmu.')
          .addFields(
            {
              name: 'LIST FEE MC BACA YA!',
              value: '```' +
                '1K — 9K : Rp 2,000\n' +
                '10K — 49K : Rp 3,000\n' +
                '50K — 99K : Rp 4,000\n' +
                '100K — 150K : Rp 7,000\n' +
                '150K — 300K : Rp 10,000\n' +
                'Nominal diatas 300K, fee 5% dari nominal transaksi.' +
                '```'
            }
          )
          .setFooter({ text: 'NS88 BOT 🤖' })
          .setTimestamp();

        const button = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('create_ticket')
              .setLabel('ORDER REKBER/MC')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('🎫')
          );

        await channel.send({ embeds: [embed], components: [button] });
        console.log(`✅ Setup message berhasil dikirim ke channel: ${channel.name}`);
      }
    } catch (error) {
      console.error('❌ Error mengirim setup message:', error.message);
      console.log('💡 Pastikan SETUP_CHANNEL_ID sudah benar dan bot punya akses ke channel tersebut');
    }
  } else {
    console.log('⚠️  SETUP_CHANNEL_ID belum diatur. Edit file index.js untuk mengatur channel auto-setup.');
  }
});

// Event: Message create (untuk command)
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // ========== FITUR SLOWMODE CUSTOM ==========
  // Cek slowmode di channel jual-beli
  if (WARNING_CHANNEL_IDS.includes(message.channel.id)) {
    const userId = message.author.id;
    const channelId = message.channel.id;
    const key = `${userId}-${channelId}`;
    
    // Cek apakah user punya role Donatur
    const isDonatur = message.member.roles.cache.some(role => role.name === DONATUR_ROLE_NAME);
    const slowmodeDuration = isDonatur ? SLOWMODE_DONATUR : SLOWMODE_NON_DONATUR;
    
    // Cek waktu terakhir user kirim pesan di channel ini
    const lastMessageTime = userLastMessageTime.get(key);
    const now = Date.now();
    
    if (lastMessageTime) {
      const timeDiff = (now - lastMessageTime) / 1000; // dalam detik
      
      if (timeDiff < slowmodeDuration) {
        // User kirim terlalu cepat!
        const remainingTime = Math.ceil(slowmodeDuration - timeDiff);
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        
        let timeString = '';
        if (minutes > 0) {
          timeString = `${minutes} menit ${seconds} detik`;
        } else {
          timeString = `${seconds} detik`;
        }
        
        // Hapus pesan user
        try {
          await message.delete();
        } catch (error) {
          console.log('Tidak bisa menghapus pesan user');
        }
        
        // Kirim warning
        const slowmodeWarning = await message.channel.send(
          `${message.author} **Slowmode khusus non-booster:** tunggu **${timeString}** sebelum kirim lagi. ` +
          `Atau boost server untuk cooldown menjadi **${SLOWMODE_DONATUR} detik**!!!`
        );
        
        // Hapus warning setelah 5 detik
        setTimeout(async () => {
          try {
            await slowmodeWarning.delete();
          } catch (error) {
            console.log('Warning sudah dihapus');
          }
        }, 5000);
        
        console.log(`⏰ Slowmode: ${message.author.tag} kirim terlalu cepat di ${message.channel.name}`);
        return; // Stop eksekusi, jangan proses pesan ini
      }
    }
    
    // Update waktu terakhir user kirim pesan
    userLastMessageTime.set(key, now);
    console.log(`✅ Pesan dari ${message.author.tag} diizinkan (${isDonatur ? 'Donatur' : 'Non-Donatur'})`);
  }
  // ========== END FITUR SLOWMODE CUSTOM ==========

  // ========== FITUR AUTO-WARNING REKBER/MC ==========
  // Auto-warning SETIAP pesan di channel yang ditentukan
  if (WARNING_CHANNEL_IDS.includes(message.channel.id)) {
    try {
      // LANGKAH 1: Hapus pesan user SEGERA
      try {
        // await message.delete();
        console.log(`🗑️ Pesan user ${message.author.tag} dihapus di ${message.channel.name}`);
      } catch (deleteError) {
        console.error('❌ Error menghapus pesan user:', deleteError.message);
        // Cek apakah bot punya permission
        if (!message.channel.permissionsFor(client.user).has(PermissionFlagsBits.ManageMessages)) {
          console.error('❌ Bot tidak punya permission "Manage Messages" di channel ini!');
        }
      }

      // LANGKAH 2: Hapus warning lama jika ada
      const lastWarningId = lastWarningMessages.get(message.channel.id);
      if (lastWarningId) {
        try {
          const oldWarning = await message.channel.messages.fetch(lastWarningId);
          await oldWarning.delete();
          console.log(`🗑️ Warning lama dihapus di ${message.channel.name}`);
        } catch (error) {
          console.log('⚠️ Warning lama sudah tidak ada atau sudah dihapus');
        }
      }

      // LANGKAH 3: Kirim warning baru
      const warningEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('⚠️ PERINGATAN: Gunakan Rekber/MC Resmi!')
        .setDescription(
          `**Jangan lupa menggunakan rekber / mc / mm di** <#${TICKET_REKBER_CHANNEL_ID}> **agar tidak terkena scam**\n\n` +
          `⚠️ **PENTING:**\n` +
          `• Gunakan layanan rekber/MC resmi untuk keamanan transaksi\n` +
          `• Hati-hati dengan penipuan!\n` +
          `• Laporkan aktivitas mencurigakan kepada admin\n\n` +
          `💡 **Tips Aman Bertransaksi:**\n` +
          `• Selalu gunakan middleman/rekber resmi\n` +
          `• Jangan percaya janji-janji yang terlalu bagus\n` +
          `• Verifikasi identitas penjual/pembeli\n` +
          `• Simpan bukti transaksi`
        )
        .setFooter({ text: 'NS88 BOT 🤖 - Auto Warning System' })
        .setTimestamp();

      const warningMessage = await message.channel.send({ embeds: [warningEmbed] });
      
      // LANGKAH 4: Simpan ID warning baru
      lastWarningMessages.set(message.channel.id, warningMessage.id);
      
      console.log(`✅ Auto-warning dikirim di ${message.channel.name} (ID: ${warningMessage.id})`);
    } catch (error) {
      console.error('❌ Error dalam auto-warning system:', error);
    }
    
    // IMPORTANT: Return agar tidak proses pesan ini lebih lanjut
    return;
  }
  // ========== END FITUR AUTO-WARNING ==========

  // Deteksi jika pesan dikirim di channel ticket dan ada attachment (screenshot)
  if (message.channel.name && message.channel.name.startsWith('ticket-ticket-')) {
    if (message.attachments.size > 0) {
      // Ada attachment (screenshot/gambar)
      const hasImage = message.attachments.some(att => 
        att.contentType && att.contentType.startsWith('image/')
      );

      if (hasImage) {
        // Auto-reply
        const replyEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('✅ Bukti Pembayaran Diterima')
          .setDescription(
            `Terima kasih **${message.author.username}**!\n\n` +
            `Bukti pembayaran Anda telah kami terima.\n` +
            `Admin/MC akan segera mengecek dan memverifikasi pembayaran Anda.\n\n` +
            `Mohon tunggu sebentar... 🕐`
          )
          .setFooter({ text: 'NS88 BOT 🤖 - Auto Response' })
          .setTimestamp();

        await message.reply({ embeds: [replyEmbed] });

        // Cari user dengan username yang ditentukan (case insensitive)
        const adminUser = message.guild.members.cache.find(member => 
          member.user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase() && 
          !member.user.bot
        );

        if (adminUser) {
          // Mention user admin
          await message.channel.send(
            `🔔 **Notifikasi untuk ${adminUser}:**\n\n` +
            `${message.author} telah mengirim bukti pembayaran. Mohon segera dicek dan diverifikasi!`
          );
          console.log(`🔔 User ${adminUser.user.tag} di-mention untuk bukti pembayaran`);
        } else {
          // Fallback: mention semua admin jika user dengan username tersebut tidak ditemukan
          const admins = message.guild.members.cache.filter(member => 
            member.permissions.has(PermissionFlagsBits.Administrator) && !member.user.bot
          );

          if (admins.size > 0) {
            const adminMentions = admins.map(admin => admin.user).join(' ');
            await message.channel.send(
              `🔔 **Notifikasi untuk Admin:**\n` +
              `${adminMentions}\n\n` +
              `${message.author} telah mengirim bukti pembayaran. Mohon segera dicek dan diverifikasi!\n\n` +
              `⚠️ *User "${ADMIN_USERNAME}" tidak ditemukan. Silakan periksa setting ADMIN_USERNAME di file bot.*`
            );
          } else {
            // Jika tidak ada admin sama sekali
            await message.channel.send(
              `🔔 **Notifikasi:**\n` +
              `${message.author} telah mengirim bukti pembayaran. Mohon segera dicek dan diverifikasi!\n\n` +
              `⚠️ *User "${ADMIN_USERNAME}" tidak ditemukan dan tidak ada admin lain di server.*`
            );
          }
        }

        console.log(`📸 Bukti pembayaran diterima dari ${message.author.tag} di ${message.channel.name}`);
      }
    }
  }

  // Command: !setup-ticket
  if (message.content === '!setup-ticket') {
    // Cek permission admin
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Hanya admin yang bisa menggunakan command ini!');
    }

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Welcome To Ticket Section')
      .setDescription('Silakan pilih dibawah sesuai kebutuhanmu.')
      .addFields(
        {
          name: 'LIST FEE MC BACA YA!',
          value: '```' +
            '1K — 9K : Rp 2,000\n' +
            '10K — 49K : Rp 3,000\n' +
            '50K — 99K : Rp 4,000\n' +
            '100K — 150K : Rp 7,000\n' +
            '150K — 300K : Rp 10,000\n' +
            'Nominal diatas 300K, fee 5% dari nominal transaksi.' +
            '```'
        }
      )
      .setFooter({ text: 'NS88 BOT 🤖' })
      .setTimestamp();

    const button = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('ORDER REKBER/MC')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎫')
      );

    await message.channel.send({ embeds: [embed], components: [button] });
    message.delete().catch(() => {});
  }

  // Command: !help
  if (message.content === '!help') {
    const helpEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📖 NS88 BOT Commands')
      .setDescription('Daftar command yang tersedia:')
      .addFields(
        { name: '!setup-ticket', value: 'Setup sistem ticket (Admin only)' },
        { name: '!help', value: 'Tampilkan pesan ini' }
      )
      .setFooter({ text: 'NS88 BOT 🤖' });
    
    await message.reply({ embeds: [helpEmbed] });
  }
});

// Event: Interaction create (untuk button, modal, dll)
client.on('interactionCreate', async (interaction) => {
  try {
    // Button: Create Ticket
    if (interaction.isButton() && interaction.customId === 'create_ticket') {
      const modal = new ModalBuilder()
        .setCustomId('ticket_form')
        .setTitle('Formulir ORDER REKBER/MC');

      const buyerInput = new TextInputBuilder()
        .setCustomId('buyer_username')
        .setLabel('USERNAME DISCORD PEMBELI')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('username#0000')
        .setRequired(true);

      const sellerInput = new TextInputBuilder()
        .setCustomId('seller_username')
        .setLabel('USERNAME DISCORD PENJUAL')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('username#0000')
        .setRequired(true);

      const itemInput = new TextInputBuilder()
        .setCustomId('item')
        .setLabel('BARANG APA')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: Akun Roblox Level 50')
        .setRequired(true);

      const nominalInput = new TextInputBuilder()
        .setCustomId('nominal')
        .setLabel('NOMINAL (cth: 30000)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Gunakan format: 30000 atau 1000000')
        .setRequired(true);

      const paymentInput = new TextInputBuilder()
        .setCustomId('payment_method')
        .setLabel('PEMBAYARAN VIA APA')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: DANA, GoPay, OVO, Transfer Bank')
        .setRequired(true);

      const rows = [buyerInput, sellerInput, itemInput, nominalInput, paymentInput].map(
        input => new ActionRowBuilder().addComponents(input)
      );

      modal.addComponents(...rows);
      await interaction.showModal(modal);
    }

    // Button: Tambah Buyer
    if (interaction.isButton() && interaction.customId.startsWith('add_buyer_')) {
      try {
        const ticketId = interaction.customId.split('_')[2];
        const ticket = tickets.get(ticketId);

        if (!ticket) {
          return interaction.reply({ content: '❌ Ticket tidak ditemukan!', flags: 64 });
        }

        const userSelectMenu = new UserSelectMenuBuilder()
          .setCustomId(`select_buyer_${ticketId}`)
          .setPlaceholder('🔍 Cari dan pilih user untuk ditambahkan sebagai Buyer')
          .setMinValues(1)
          .setMaxValues(1);

        const row = new ActionRowBuilder().addComponents(userSelectMenu);

        await interaction.reply({
          content: '👤 **Pilih user yang ingin ditambahkan sebagai Buyer:**\n💡 Gunakan search bar untuk mencari user dengan cepat!',
          components: [row],
          flags: 64
        });

        console.log('✅ User select menu (Buyer) berhasil ditampilkan');
      } catch (error) {
        console.error('❌ Error add_buyer:', error);
        await interaction.reply({ 
          content: '❌ Terjadi kesalahan!', 
          flags: 64
        });
      }
    }

    // Button: Tambah Seller
    if (interaction.isButton() && interaction.customId.startsWith('add_seller_')) {
      try {
        const ticketId = interaction.customId.split('_')[2];
        const ticket = tickets.get(ticketId);

        if (!ticket) {
          return interaction.reply({ content: '❌ Ticket tidak ditemukan!', flags: 64 });
        }

        const userSelectMenu = new UserSelectMenuBuilder()
          .setCustomId(`select_seller_${ticketId}`)
          .setPlaceholder('🔍 Cari dan pilih user untuk ditambahkan sebagai Seller')
          .setMinValues(1)
          .setMaxValues(1);

        const row = new ActionRowBuilder().addComponents(userSelectMenu);

        await interaction.reply({
          content: '💼 **Pilih user yang ingin ditambahkan sebagai Seller:**\n💡 Gunakan search bar untuk mencari user dengan cepat!',
          components: [row],
          flags: 64
        });

        console.log('✅ User select menu (Seller) berhasil ditampilkan');
      } catch (error) {
        console.error('❌ Error add_seller:', error);
        await interaction.reply({ 
          content: '❌ Terjadi kesalahan!', 
          flags: 64
        });
      }
    }

    // Select Menu: Pilih Buyer (User Select)
    if (interaction.isUserSelectMenu() && interaction.customId.startsWith('select_buyer_')) {
      const ticketId = interaction.customId.split('_')[2];
      const ticket = tickets.get(ticketId);
      const userId = interaction.values[0];

      if (!ticket) {
        return interaction.update({ content: '❌ Ticket tidak ditemukan!', components: [] });
      }

      const selectedUser = await interaction.guild.members.fetch(userId);
      
      if (selectedUser.user.bot) {
        return interaction.update({
          content: '❌ Tidak bisa menambahkan bot sebagai Buyer!',
          components: []
        });
      }

      const ticketChannel = await interaction.guild.channels.fetch(ticket.channelId);
      await ticketChannel.permissionOverwrites.create(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });

      if (!ticket.allowedUsers.includes(userId)) {
        ticket.allowedUsers.push(userId);
      }

      await ticketChannel.send(`👤 **${selectedUser.user.tag}** telah ditambahkan sebagai **Buyer** oleh ${interaction.user.tag}`);

      await interaction.update({
        content: `✅ **${selectedUser.user.tag}** berhasil ditambahkan sebagai Buyer!`,
        components: []
      });
    }

    // Select Menu: Pilih Seller (User Select)
    if (interaction.isUserSelectMenu() && interaction.customId.startsWith('select_seller_')) {
      const ticketId = interaction.customId.split('_')[2];
      const ticket = tickets.get(ticketId);
      const userId = interaction.values[0];

      if (!ticket) {
        return interaction.update({ content: '❌ Ticket tidak ditemukan!', components: [] });
      }

      const selectedUser = await interaction.guild.members.fetch(userId);
      
      if (selectedUser.user.bot) {
        return interaction.update({
          content: '❌ Tidak bisa menambahkan bot sebagai Seller!',
          components: []
        });
      }

      const ticketChannel = await interaction.guild.channels.fetch(ticket.channelId);
      await ticketChannel.permissionOverwrites.create(userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });

      if (!ticket.allowedUsers.includes(userId)) {
        ticket.allowedUsers.push(userId);
      }

      await ticketChannel.send(`💼 **${selectedUser.user.tag}** telah ditambahkan sebagai **Seller** oleh ${interaction.user.tag}`);

      await interaction.update({
        content: `✅ **${selectedUser.user.tag}** berhasil ditambahkan sebagai Seller!`,
        components: []
      });
    }

    // Button: Selesai (Hanya Admin)
    if (interaction.isButton() && interaction.customId.startsWith('complete_')) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ 
          content: '❌ **Hanya Admin yang bisa menandai transaksi selesai!**', 
          flags: 64
        });
      }

      const ticketId = interaction.customId.split('_')[1];
      const ticket = tickets.get(ticketId);

      if (ticket) {
        ticket.status = 'selesai';
        await interaction.reply('✅ **Transaksi ditandai selesai oleh Admin!**');
        
        const channel = interaction.channel;
        const messages = await channel.messages.fetch({ limit: 10 });
        const ticketMessage = messages.find(m => m.embeds[0]?.footer?.text?.includes(ticketId));
        
        if (ticketMessage) {
          const updatedEmbed = EmbedBuilder.from(ticketMessage.embeds[0])
            .setColor('#00FF00')
            .setTitle('✅ ORDER REKBER/MC - SELESAI');
          await ticketMessage.edit({ embeds: [updatedEmbed], components: [] });
        }
        
        await archiveAndDeleteTicket(ticket, 'selesai', interaction.guild);
      }
    }

    // Button: Batalkan (Buyer, Seller, atau Admin)
    if (interaction.isButton() && interaction.customId.startsWith('cancel_')) {
      const ticketId = interaction.customId.split('_')[1];
      const ticket = tickets.get(ticketId);

      if (!ticket) {
        return interaction.reply({ 
          content: '❌ Ticket tidak ditemukan!', 
          flags: 64
        });
      }

      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
      const isAllowedUser = ticket.allowedUsers && ticket.allowedUsers.includes(interaction.user.id);

      console.log('🔍 Cek permission batalkan:', {
        userId: interaction.user.id,
        username: interaction.user.tag,
        isAdmin,
        isAllowedUser,
        allowedUsers: ticket.allowedUsers
      });

      if (!isAdmin && !isAllowedUser) {
        return interaction.reply({ 
          content: '❌ **Hanya Admin, Buyer, atau Seller yang bisa membatalkan transaksi!**', 
          flags: 64
        });
      }

      ticket.status = 'dibatalkan';
      await interaction.reply(`❌ **Transaksi dibatalkan oleh ${interaction.user.tag}!**`);
      
      const channel = interaction.channel;
      const messages = await channel.messages.fetch({ limit: 10 });
      const ticketMessage = messages.find(m => m.embeds[0]?.footer?.text?.includes(ticketId));
      
      if (ticketMessage) {
        const updatedEmbed = EmbedBuilder.from(ticketMessage.embeds[0])
          .setColor('#FF0000')
          .setTitle('❌ ORDER REKBER/MC - DIBATALKAN');
        await ticketMessage.edit({ embeds: [updatedEmbed], components: [] });
      }
      
      await archiveAndDeleteTicket(ticket, 'dibatalkan', interaction.guild);
    }

    // Modal Submit: Ticket Form
    if (interaction.isModalSubmit() && interaction.customId === 'ticket_form') {
      try {
        await interaction.deferReply({ flags: 64 }); // 64 = ephemeral flag

        const buyer = interaction.fields.getTextInputValue('buyer_username');
        const seller = interaction.fields.getTextInputValue('seller_username');
        const item = interaction.fields.getTextInputValue('item');
        const nominalRaw = interaction.fields.getTextInputValue('nominal').replace(/\D/g, '');
        const nominal = parseInt(nominalRaw);
        const paymentMethod = interaction.fields.getTextInputValue('payment_method');

        console.log('📝 Form data:', { buyer, seller, item, nominal, paymentMethod });

        if (isNaN(nominal) || nominal < 1000) {
          return interaction.editReply({ content: '❌ Nominal tidak valid! Minimal Rp 1,000' });
        }

        const fee = calculateFee(nominal);
        const total = nominal + fee;
        const ticketId = `TICKET-${ticketCounter++}`;

        console.log('💰 Perhitungan:', { nominal, fee, total });

        let ticketChannel;
        try {
          ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${ticketId.toLowerCase()}`,
            type: ChannelType.GuildText,
            parent: interaction.channel.parentId,
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: interaction.user.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages
                ],
              },
              {
                id: client.user.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.EmbedLinks,
                  PermissionFlagsBits.AttachFiles,
                  PermissionFlagsBits.ReadMessageHistory
                ],
              },
            ],
          });
          console.log('✅ Channel created:', ticketChannel.name);
        } catch (channelError) {
          console.error('❌ Error creating channel:', channelError);
          return interaction.editReply({ 
            content: '❌ Gagal membuat channel ticket. Pastikan bot punya permission "Manage Channels".' 
          });
        }

        tickets.set(ticketId, {
          id: ticketId,
          buyer,
          seller,
          item,
          nominal,
          fee,
          total,
          paymentMethod,
          status: 'pending',
          channelId: ticketChannel.id,
          creatorId: interaction.user.id,
          allowedUsers: [interaction.user.id],
          createdAt: new Date()
        });

        console.log('💾 Ticket saved:', ticketId);

        const ticketEmbed = new EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('🎫 ORDER REKBER/MC - PENDING')
          .setDescription(
            `**Detail Transaksi:**\n` +
            `🛒 **Barang:** ${item}\n\n` +
            `👤 **Pembeli:** ${buyer}\n` +
            `💼 **Penjual:** ${seller}\n\n` +
            `💰 **Nominal:** ${formatRupiah(nominal)}\n` +
            `💵 **Fee Jasa MC:** ${formatRupiah(fee)}\n` +
            `💳 **Total Pembayaran:** ${formatRupiah(total)}\n\n` +
            `💳 **Metode Pembayaran:** ${paymentMethod}\n\n` +
            `─────────────────────────────\n` +
            `**🏦 INFORMASI PEMBAYARAN QRIS**\n` +
            `Ajie Yunisyaputra, Ahli Osteopati\n` +
            `**SCAN UNTUK MELAKUKAN TRANSFER**\n` +
            `**NMID:** ID1025461592426\n` 
          )
          .setImage('https://cdn.discordapp.com/attachments/1453015494650232842/1458349144963022910/1767753033603.png?ex=695f50fa&is=695dff7a&hm=de2a9ed63a8c6c3f4ac92a814b5fdb3ead0985a93efff6f437f5247e099976e1')
          .setFooter({ text: `${ticketId} | NS88 BOT 🤖` })
          .setTimestamp();

        const buttons = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`add_buyer_${ticketId}`)
              .setLabel('Tambah Buyer')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('👤'),
            new ButtonBuilder()
              .setCustomId(`add_seller_${ticketId}`)
              .setLabel('Tambah Seller')
              .setStyle(ButtonStyle.Primary)
              .setEmoji('💼'),
            new ButtonBuilder()
              .setCustomId(`complete_${ticketId}`)
              .setLabel('Selesai')
              .setStyle(ButtonStyle.Success)
              .setEmoji('✅'),
            new ButtonBuilder()
              .setCustomId(`cancel_${ticketId}`)
              .setLabel('Batalkan')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('❌')
          );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [buttons] });
        console.log('✅ Embed sent to channel');

        const successReply = await interaction.editReply({ 
          content: `✅ Ticket berhasil dibuat! Silakan cek channel ${ticketChannel}` 
        });

        setTimeout(async () => {
          try {
            await successReply.delete();
          } catch (error) {
            console.log('Pesan sudah dihapus atau tidak bisa dihapus');
          }
        }, 5000);

      } catch (error) {
        console.error('❌ Error dalam modal submit:', error);
        console.error('Error stack:', error.stack);
        
        const errorMessage = error.message || 'Unknown error';
        
        if (interaction.deferred) {
          await interaction.editReply({ 
            content: `❌ Terjadi kesalahan: ${errorMessage}\n\nCek console untuk detail lengkap.` 
          });
        } else {
          await interaction.reply({ 
            content: `❌ Terjadi kesalahan: ${errorMessage}`, 
            flags: 64
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Error pada interaction:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Terjadi kesalahan!', flags: 64 });
    } else {
      await interaction.reply({ content: '❌ Terjadi kesalahan!', flags: 64 });
    }
  }
});

// Error handling
client.on('error', error => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
});

// Login bot - GANTI TOKEN DI BAWAH INI!
client.login(process.env.TOKEN)
  .catch(error => {
    console.error('❌ Error login bot:', error);
  })