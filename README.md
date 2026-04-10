# 每日菜单 - 微信小程序

一款帮助你根据现有食材和锅具发现美味菜谱的微信小程序。

## 功能特性

- **食材选择** — 6 大分类 60+ 种预设食材，支持自定义添加
- **锅具选择** — 10 种预设锅具，支持自定义添加
- **智能匹配** — 根据食材和锅具智能匹配菜谱，按匹配度排序
- **菜谱详情** — 完整的食材清单、烹饪步骤和小贴士
- **自定义菜谱** — 用户可以添加、编辑、删除自己的菜谱
- **随机推荐** — 不知道吃什么？一键随机推荐
- **云数据库** — 基于微信云开发，数据云端存储

## 项目结构

```
├── miniprogram/                # 小程序源码
│   ├── pages/
│   │   ├── index/             # 首页 - 食材/锅具选择
│   │   ├── result/            # 搜索结果页
│   │   ├── detail/            # 菜谱详情页
│   │   ├── init/              # 数据库初始化页
│   │   ├── manage/            # 管理中心
│   │   ├── manage-ingredients/# 食材管理
│   │   ├── manage-cookware/   # 锅具管理
│   │   ├── add-recipe/        # 添加/编辑菜谱
│   │   └── my-recipes/        # 我的菜谱列表
│   ├── components/
│   │   └── recipe-card/       # 菜谱卡片组件
│   ├── data/
│   │   ├── recipes.js         # 预设菜谱数据（60 道）
│   │   └── constants.js       # 公共常量
│   └── utils/
│       └── util.js            # 工具函数
├── cloudfunctions/             # 云函数
│   ├── getRecipes/            # 菜谱搜索与查询
│   └── initData/              # 数据初始化
└── project.config.json        # 项目配置
```

## 云数据库集合

| 集合名 | 用途 | 权限 |
|--------|------|------|
| `recipes` | 预设菜谱 | 所有用户可读 |
| `custom_ingredients` | 用户自定义食材 | 仅创建者可读写 |
| `custom_cookware` | 用户自定义锅具 | 仅创建者可读写 |
| `custom_recipes` | 用户自定义菜谱 | 仅创建者可读写 |

## 快速开始

### 前提条件

- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序账号并开通云开发

### 安装步骤

1. 克隆仓库

```bash
git clone https://github.com/haotian345/daily_menu.git
```

2. 复制示例配置文件并填写你的信息

```bash
cp project.config.example.json project.config.json
cp project.private.config.example.json project.private.config.json
```

然后编辑 `project.config.json`，将 `appid` 替换为你自己的小程序 AppID。

3. 打开微信开发者工具，导入项目目录

4. 在云开发控制台中创建以下集合并设置权限：
   - `recipes` — 所有用户可读
   - `custom_ingredients` — 仅创建者可读写
   - `custom_cookware` — 仅创建者可读写
   - `custom_recipes` — 仅创建者可读写

5. 部署云函数 `getRecipes`

6. 首次运行时，程序会自动将预设菜谱导入云数据库；也可以手动访问初始化页面完成导入

## 技术栈

- 微信小程序原生框架
- 微信云开发（云数据库 + 云函数）
- JavaScript (ES6+)

## 许可证

MIT License
