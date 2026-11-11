import type { ReactNode } from 'react'
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Text,
} from 'react-email'
import { productName } from '../brand'
import { schemeCss, styles } from './emailStyles'

/** The square of an org with its initials, as the org rail of the app shows it. */
export function InitialsTile(props: { initials: string }) {
  return (
    <table cellPadding={0} cellSpacing={0} role="presentation">
      <tbody>
        <tr>
          <td className="cd-tile" style={styles.tile}>
            {props.initials}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

/** The paragraphs of an email, above its button. */
export function Paragraphs(props: { lines: readonly string[] }) {
  return props.lines.map((line) => (
    <Text className="cd-text" key={line} style={styles.paragraph}>
      {line}
    </Text>
  ))
}

/**
 * The page around the card. It carries the page colour in a table cell,
 * because some email clients drop the styles of the body.
 */
function Page(props: { children: ReactNode }) {
  return (
    <Row>
      <Column className="cd-page" style={styles.page}>
        {props.children}
      </Column>
    </Row>
  )
}

/**
 * A block with space above it. The space is the padding of a table cell,
 * which every email client keeps.
 */
function Block(props: { top: number; children: ReactNode }) {
  return (
    <Row>
      <Column style={{ paddingTop: props.top }}>{props.children}</Column>
    </Row>
  )
}

/** The app icon and the name of the product, at the top of each email. */
function Brand(props: { logoSrc: string }) {
  return (
    <Row>
      <Column style={{ width: 38 }}>
        <Img alt="" height={28} src={props.logoSrc} width={28} />
      </Column>
      <Column>
        <Text className="cd-ink" style={styles.brand}>
          {productName}
        </Text>
      </Column>
    </Row>
  )
}

/** The heading of an email, with a mark before it when one is given. */
function Title(props: { text: string; mark?: ReactNode }) {
  const heading = (
    <Heading className="cd-ink" style={styles.heading}>
      {props.text}
    </Heading>
  )
  if (!props.mark) return heading
  // The mark is taller than one line of the heading. The padding centres a
  // short heading on the mark, and a long one starts at the top of it.
  return (
    <Row>
      <Column style={{ width: 48, verticalAlign: 'top' }}>{props.mark}</Column>
      <Column style={{ paddingTop: 4, verticalAlign: 'top' }}>{heading}</Column>
    </Row>
  )
}

/**
 * The layout of every email of Conductive: the brand, one heading, the
 * paragraphs, one button, the address of the button as a plain link, and
 * a footer. It is light by default, with dark colours for the email
 * clients that read them.
 */
export function EmailLayout(props: {
  preview: string
  /** The address of the app icon. */
  logoSrc: string
  heading: string
  /** A mark before the heading, such as the tile of an org. */
  headingMark?: ReactNode
  children: ReactNode
  button: { label: string; href: string }
  /** A line under the button, such as the account to sign in with. */
  note?: string
  linkIntro: string
  footer: readonly string[]
}) {
  return (
    <Html className="cd-page" lang="en" style={styles.root}>
      <Head>
        <meta content="light dark" name="color-scheme" />
        <meta content="light dark" name="supported-color-schemes" />
        <style dangerouslySetInnerHTML={{ __html: schemeCss }} />
      </Head>
      <Body style={styles.body}>
        <Preview>{props.preview}</Preview>
        <Page>
          <Container className="cd-card" style={styles.card}>
            <Row>
              <Column className="cd-content" style={styles.content}>
                <Brand logoSrc={props.logoSrc} />
                <Block top={28}>
                  <Title mark={props.headingMark} text={props.heading} />
                </Block>
                <Block top={16}>{props.children}</Block>
                <Block top={12}>
                  <Button
                    className="cd-button"
                    href={props.button.href}
                    style={styles.button}
                  >
                    {props.button.label}
                  </Button>
                </Block>
                {props.note ? (
                  <Text className="cd-muted" style={styles.small}>
                    {props.note}
                  </Text>
                ) : null}
                <Text className="cd-muted" style={styles.small}>
                  {props.linkIntro}{' '}
                  <Link
                    className="cd-link"
                    href={props.button.href}
                    style={styles.link}
                  >
                    {props.button.href}
                  </Link>
                </Text>
                <Hr className="cd-rule" style={styles.rule} />
                {props.footer.map((line) => (
                  <Text className="cd-muted" key={line} style={styles.footer}>
                    {line}
                  </Text>
                ))}
              </Column>
            </Row>
          </Container>
        </Page>
      </Body>
    </Html>
  )
}
