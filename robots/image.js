const google = require('googleapis').google
const customSearch = google.customsearch('v1')
const state = require('./state.js')

const googleSearchCredentials = require('../credentials/google-search.json')
async function robot() {
  const content = state.load()

  await fetchImagesOffAllSentences(content)

  state.save(content)

  async function fetchImagesOffAllSentences(content) {
    for (const sentence of content.sentences) {
      const query = `${content.prefix} ${content.searchTerm} ${sentence.keywords[0]}`
      sentence.images = await fetchGoogleAndReturnImagesLinks(query)
      
      sentence.googleSearchQuery = query
    }
  }
  
  async function fetchGoogleAndReturnImagesLinks(query) {
    const response = await customSearch.cse.list({
      auth: googleSearchCredentials.apiKey,
      cx: googleSearchCredentials.searchEngineID,
      q: query,
      searchType: 'image',
      num: 2
    })

    if (response.data.items) {
      try {
        const imagesUrl = response.data.items.map((item) => {
          return item.link
        })
        return imagesUrl
      }
      catch(e) {
        return imagesUrl
      }
    }

  }

}

module.exports = robot