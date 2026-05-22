// server/api/grafana/stream.ts

export default defineEventHandler((event) => {
    setHeader(event, 'Content-Type', 'text/event-stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')

    const send = () => {
        event.node.res.write(
            `data: ${JSON.stringify(Object.values(state))}\n\n`
        )
    }

    const interval = setInterval(send, 2000)

    event.node.req.on('close', () => {
        clearInterval(interval)
    })
})