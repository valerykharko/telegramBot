const TelegramAPI = require("node-telegram-bot-api");
const { gameOptions, againOptions } = require("./options");
const sequelize = require("./db");
const UserModel = require("./models");

const TGToken = "1909111654:AAE4MKP4p8E4MiDqt_Fs2MtyvvfHDoRlzVM";

const bot = new TelegramAPI(TGToken, { polling: true });

const chats = {};

const startGame = async (chatId, message) => {
  await bot.sendMessage(
    chatId,
    `${message.from.first_name}, сейчас я загадаю цифру от 0 до 9, а ты должен ее угадать`
  );
  const randomNumber = Math.floor(Math.random() * 10);
  console.log(randomNumber);
  chats[chatId] = randomNumber;
  await bot.sendMessage(chatId, "Отгадывай", gameOptions);
};

const startTgBot = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
  } catch (e) {
    console.log(e);
  }
  bot.setMyCommands([
    { command: "/start", description: "Начальное приветствие" },
    { command: "/info", description: "Получить информацию о пользователе" },
    { command: "/game", description: `Игра "Угадай цифру"` },
  ]);

  bot.on("message", async (message) => {
    const text = message.text;
    const chatId = message.chat.id;
    try {
      if (text === "/start") {
        await UserModel.create({ chatId });
        await bot.sendMessage(chatId, `Привет! Это telegramBot "OutplayMeBot"`);
        return bot.sendSticker(
          chatId,
          "https://tlgrm.ru/_/stickers/22c/b26/22cb267f-a2ab-41e4-8360-fe35ac048c3b/8.webp"
        );
      }
      if (text === "/info") {
        const user = await UserModel.findOne({ chatId });
        return bot.sendMessage(
          chatId,
          `Тебя зовут ${message.from.first_name}, в игре у тебя правильный ответов: ${user.right}, неправильный: ${user.wrong}`
        );
      }
      if (text === "/game") {
        return startGame(chatId, message);
      }
      return bot.sendMessage(
        chatId,
        `${message.from.first_name}, я тебя не понимаю, попробуй еще раз!`
      );
    } catch (e) {
      bot.sendMessage(chatId, "Произошла какая-то ошибка)");
    }
  });

  bot.on("callback_query", async (msg) => {
    const data = msg.data;
    const chatId = msg.message.chat.id;
    if (data === "/again") {
      return startGame(chatId, msg);
    }
    const user = await UserModel.findOne({ chatId });
    if (data === chats[chatId].toString()) {
      user.right += 1;
      await bot.sendSticker(
        chatId,
        "https://cdn.tlgrm.app/stickers/22c/b26/22cb267f-a2ab-41e4-8360-fe35ac048c3b/192/5.webp"
      );
      await bot.sendMessage(
        chatId,
        `Поздравляю, ${msg.from.first_name}, ты отгадал - это была цифра ${chats[chatId]}`,
        againOptions
      );
    } else {
      user.wrong += 1;
      await bot.sendSticker(
        chatId,
        "https://tlgrm.ru/_/stickers/22c/b26/22cb267f-a2ab-41e4-8360-fe35ac048c3b/192/31.webp"
      );
      await bot.sendMessage(
        chatId,
        `${msg.from.first_name}, к сожалению ты не угадал, TelegramBot загадал цифру ${chats[chatId]}`,
        againOptions
      );
      await user.save();
    }
  });
};

startTgBot();
