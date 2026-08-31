import type { ReactNode } from 'react'

/**
 * 每天出海一小时的中文隐私政策正文。
 * 内容按当前应用实际处理的数据范围编写，避免把模板默认能力误写成产品承诺。
 */
export function PrivacyPolicyContent() {
  return (
    <article className="mt-8 space-y-8 text-[15px] leading-8 text-fg-2">
      <p>
        生效日期：2026 年 9 月 1 日
      </p>

      <p>
        欢迎使用“每天出海一小时”。本隐私政策说明网站如何收集、使用、保存和保护与账号及打卡服务有关的信息。网站由个人运营，联系邮箱为{' '}
        <a className="font-semibold text-primary underline underline-offset-4" href="mailto:support@daka.run">
          support@daka.run
        </a>
        。使用本网站，即表示已阅读并理解本政策。
      </p>

      <PolicySection title="一、适用范围">
        <p>
          本政策适用于 daka.run 提供的账号注册、登录、每日打卡、打卡记录、图片上传、博客及相关后台功能。若某项功能有单独的隐私说明，单独说明与本政策不一致的部分，以单独说明为准。
        </p>
      </PolicySection>

      <PolicySection title="二、我们收集的信息">
        <p>根据实际使用的功能，我们可能处理以下信息：</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>账号信息：邮箱、昵称、密码的加密哈希值、邮箱验证状态、头像，以及账号创建和更新时间。</li>
          <li>登录与安全信息：登录会话、会话有效期、登录 IP 地址、浏览器及设备 User-Agent 等安全审计信息。</li>
          <li>打卡内容：打卡日期、出海时长、外链数量、质量自评、每日记录文字，以及主动上传的截图或其他图片。</li>
          <li>技术信息：浏览器类型、设备相关信息、必要的 Cookie、本地偏好、请求日志、错误信息和用于保障服务稳定性的基础运行数据。</li>
          <li>反馈与联系信息：主动提交的意见、问题描述、邮箱及与客服沟通时提供的其他内容。</li>
          <li>交易信息：如果使用付费或赞助功能，可能处理套餐、支付状态、订单或交易标识等信息。银行卡号等完整支付凭证由支付服务商处理，网站通常不会保存。</li>
        </ul>
      </PolicySection>

      <PolicySection title="三、我们如何使用这些信息">
        <ul className="list-disc space-y-2 pl-6">
          <li>创建和维护账号，完成登录、身份验证和会话管理。</li>
          <li>保存、展示和整理个人打卡记录，提供历史记录、图片查看及相关功能。</li>
          <li>识别异常登录、滥用、垃圾内容和安全风险，保护网站及用户。</li>
          <li>回复反馈、处理故障、提供必要的服务通知。</li>
          <li>处理订阅、赞助或其他交易相关事务，并履行相应的财务和合规义务。</li>
          <li>分析运行错误和使用情况，以改进功能、性能和可靠性。</li>
        </ul>
        <p>
          我们不会将个人信息出售给第三方，也不会为了与本服务无关的目的出租个人信息。
        </p>
      </PolicySection>

      <PolicySection title="四、内容的公开与分享">
        <p>
          未主动分享的账号和打卡内容，原则上仅用于账号内的服务功能。用户主动创建或发布的公开分享内容可能被其他人访问、复制或传播；一旦主动公开，网站无法保证其不会被第三方保存。请勿在打卡文字或图片中放入身份证件、密码、支付凭证等不适合公开的信息。
        </p>
      </PolicySection>

      <PolicySection title="五、信息保存与安全">
        <p>
          账号、会话、打卡记录等结构化数据保存在网站使用的数据库中，上传图片等文件保存在对象存储中。我们会根据数据敏感程度采取访问控制、密码哈希、会话管理、权限隔离和传输加密等合理措施。
        </p>
        <p>
          互联网传输和电子存储都不能保证绝对安全。若发生可能影响个人信息的安全事件，我们会在适用法律要求的范围内采取补救措施并进行必要通知。
        </p>
      </PolicySection>

      <PolicySection title="六、第三方服务与信息披露">
        <p>
          为提供身份认证、数据库、对象存储、邮件、支付、反滥用、运行监控和基础安全能力，我们可能使用可信的第三方服务商。服务商只能在提供相关服务所需的范围内处理信息，并应承担相应的安全与保密义务。
        </p>
        <p>
          在以下情形下，我们可能披露必要的信息：获得用户同意；为履行用户请求或提供服务；遵守法律法规、司法或行政机关的合法要求；调查安全事件、欺诈、滥用或其他违法行为；或为保护网站、用户及公众的合法权益。
        </p>
      </PolicySection>

      <PolicySection title="七、Cookie 与本地存储">
        <p>
          网站可能使用维持登录状态所必需的 Cookie，以及保存主题、语言或其他界面偏好的本地存储。关闭或清理 Cookie 可能导致登录状态失效，部分功能也可能无法正常使用。我们不在本政策中承诺使用与服务无关的广告追踪技术。
        </p>
      </PolicySection>

      <PolicySection title="八、保存期限">
        <p>
          我们会在提供服务所需的期限内保存信息。账号和打卡记录通常会在用户主动删除账号或相关内容后，按删除流程从数据库及对象存储中清理；备份、缓存、法律、财务、争议处理和安全审计记录，可能在必要期限内继续保留，之后再删除或匿名化。
        </p>
      </PolicySection>

      <PolicySection title="九、删除账号与个人信息">
        <p>
          用户可以在登录后的账号设置中发起账号删除。删除确认后，我们会按现有删除流程清理账号关联的数据库记录和已上传图片等对象存储文件。依法必须保留的法律、支付、财务或安全记录，不会因账号删除而提前清除；保留期间仅用于相应目的。
        </p>
        <p>
          如果无法登录账号或删除过程中遇到问题，可发送邮件至{' '}
          <a className="font-semibold text-primary underline underline-offset-4" href="mailto:support@daka.run">
            support@daka.run
          </a>
          ，并说明需要处理的事项。为防止他人冒充，我们可能要求提供合理的身份核验信息。
        </p>
      </PolicySection>

      <PolicySection title="十、未成年人">
        <p>
          本服务不以未成年人为主要服务对象。若监护人认为未成年人在未经适当同意的情况下向我们提供了个人信息，请通过本政策中的邮箱联系我们，我们会在核实后采取合理措施处理。
        </p>
      </PolicySection>

      <PolicySection title="十一、本政策的更新">
        <p>
          当服务功能、法律要求或数据处理方式发生变化时，我们可能更新本政策。更新后的版本会在本页面发布，并更新生效日期；重大变化会通过网站提示或其他合理方式通知。继续使用服务，即表示接受更新后的政策。
        </p>
      </PolicySection>

      <PolicySection title="十二、联系我们">
        <p>
          对本隐私政策、个人信息处理或账号删除有疑问，请联系：{' '}
          <a className="font-semibold text-primary underline underline-offset-4" href="mailto:support@daka.run">
            support@daka.run
          </a>
          。
        </p>
      </PolicySection>
    </article>
  )
}

/** 统一隐私政策各章节的标题和段落间距，保持长文阅读节奏一致。 */
function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  )
}
