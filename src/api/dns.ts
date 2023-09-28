// import dns from 'native-dns'

export function enableDNS() {
  // disabled
  return

  // DNS server
  // const nameserver = dns.createServer()
  // nameserver.on('request', function (request: any, response: any) {
  //   console.log(request)
  //   response.answer.push(
  //     dns.TXT({
  //       name: request.question[0].name,
  //       data: ['acme validation'],
  //       ttl: 600,
  //     })
  //   )
  //   // response.additional.push(
  //   //   dns.A({
  //   //     name: 'hostA.example.org',
  //   //     address: '127.0.0.3',
  //   //     ttl: 600,
  //   //   })
  //   // )
  //   response.send()
  // })

  // // nameserver.on('error', function (err, buff, req, res) {
  // //   console.log(err.stack)
  // // })

  // nameserver.serve(53)
}
