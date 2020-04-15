const algorithmia = require("algorithmia");
const algorithmiaApiKey = require("../credentials/algorithmia.json").apiKey;
const watsonApiKey = require("../credentials/watson-nlu.json").apikey;
const sbd = require("sbd");

const NaturalLanguageUnderstandingV1 = require("watson-developer-cloud/natural-language-understanding/v1.js");

const nlu = new NaturalLanguageUnderstandingV1({
  iam_apikey: watsonApiKey,
  version: "2018-04-05",
  // url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
  url:
    "https://gateway-lon.watsonplatform.net/natural-language-understanding/api/v1/analyze?"
});

const state = require('./state.js')

async function robot(content) {
  content = state.load()

  await fetchContentFromWikipedia(content),
    sanitizeContent(content),
    breakContentIntoSentence(content),
    limitMaximumSentences(content),
    await fetchKeyWordsOffAllSentences(content)

    state.save(content)

  async function fetchContentFromWikipedia(content) {
    const input = {
      articleName: content.searchTerm,
      lang: "pt"
    };

    const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey);
    const wikipediaAlgorithm = algorithmiaAuthenticated.algo(
      "web/WikipediaParser/0.1.2?timeout=300"
    );
    const wikipediaResponse = await wikipediaAlgorithm.pipe(input);
    const wikipediaContent = wikipediaResponse.get();

    content.sourceContentOriginal = wikipediaContent.content;
  }

  function sanitizeContent(content) {
    const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(
      content.sourceContentOriginal
    );
    const withoutDatesInParentheses = removeDatesInParentheses(
      withoutBlankLinesAndMarkdown
    );

    content.sourceContentSanitized = withoutDatesInParentheses;

    function removeBlankLinesAndMarkdown(text) {
      const allLines = text.split("\n");

      const withoutBlankLinesAndMarkdown = allLines.filter(line => {
        if (line.trim().length === 0 || line.trim().startsWith("=")) {
          return false;
        }

        return true;
      });

      return withoutBlankLinesAndMarkdown.join(" ");
    }
  }

  function removeDatesInParentheses(text) {
    return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, "").replace(/  /g, " ");
  }

  function breakContentIntoSentence(content) {
    content.sentences = [];
    const sentences = sbd.sentences(content.sourceContentSanitized);

    sentences.forEach(sentence => {
      content.sentences.push({
        text: sentence,
        kewords: [],
        images: []
      });
    });
  }

  function limitMaximumSentences(content) {
    content.sentences = content.sentences.slice(0,content.maximumSentences);
  }

  async function fetchKeyWordsOffAllSentences(content) {
    for (const sentence of content.sentences) {
      sentence.keywords = await fetchWatsonAndReturnKeyWords(sentence.text)
    }
  }

  async function fetchWatsonAndReturnKeyWords(sentence) {
    return new Promise((resolve, reject) => {
      nlu.analyze(
        {
          text: sentence,
          features: {
            keywords: {}
          }
        },
        (err, resp) => {
          if (err) {
            throw err;
          }

          const keywords = resp.keywords.map(keyword => {
            return keyword.text;
          });

          resolve(keywords);
        }
      );
    });
  }
}

module.exports = robot;
